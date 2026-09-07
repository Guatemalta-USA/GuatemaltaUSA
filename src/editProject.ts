import { initializeApp } from './main.js';
import { TheEditor } from './modules/editor.js';
import { deleteProject, getProjectById, saveProject } from './firebase/firebaseService.js';
import { Timestamp } from 'firebase/firestore';
import { confirmDeleteModal, createMessage, storeMessage } from './modules/utils.js';
import { Project, type LocalizedString, type SupportedLanguage, type LocalizedContent } from './models.js';
import { navigateTo } from './modules/navigate.js';
import { getAuthenticatedUser, getUserRole } from './firebase/authService.js';

export class EditProjectPage {
    private editor: TheEditor | null = null;
    private currentProjectId: string | null = null;
    private currentProject: Project | null = null;
    private activeLang: SupportedLanguage = 'en';
    private localizedTitles: LocalizedString = { en: '', es: '' };

    constructor() {
        this.init();
    }

    private async waitForElement(selector: string, timeout = 3000): Promise<HTMLElement | null> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) return el;
            await new Promise(res => setTimeout(res, 50));
        }
        return null;
    }

    private async init(): Promise<void> {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.currentProjectId = urlParams.get('id') || urlParams.get('projectId');

            await initializeApp("Impact", this.currentProjectId ? 'Edit Project' : 'Create Project', {
                type: "project",
                projectId: this.currentProjectId || undefined
            });

            const user = await getAuthenticatedUser();
            if (!user) {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/blog");
                return;
            }

            const role = await getUserRole(user.uid);
            if (role !== 'admin') {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/impact");
                return;
            }

            const editSection = document.getElementById('edit-section');
            if (editSection) {
                editSection.classList.remove('hide');
            }

            const container = await this.waitForElement('#editor-container');
            if (!container) {
                console.error('[EditProjectPage] Could not find "#editor-container" in the DOM.');
                return;
            }

            this.editor = new TheEditor();
            this.setupTabNavigation();
            this.setupSaveHandler();
            this.setupDeleteHandler();
            this.setUpCheckboxes();

            if (this.currentProjectId) {
                await this.loadProjectData(this.currentProjectId);
            } else {
                this.currentProject = new Project(
                    { en: '', es: '' },
                    { en: [], es: [] },
                    true,
                    false,
                    null,
                    0,
                    "",
                    Timestamp.now()
                );
                this.syncLanguageUI('en');
            }

        } catch (error) {
            console.error("[EditProjectPage] Initialization failed:", error);
            createMessage({ messageBody: "Failed to load page editor.", location: "main-message", type: "error" });
        }
    }

    private async loadProjectData(projectId: string): Promise<void> {
        try {
            this.currentProject = await getProjectById(projectId);

            if (!this.currentProject) {
                createMessage({ messageBody: "Project not found", location: "main-message", type: "error" });
                return;
            }

            this.localizedTitles = {
                en: this.currentProject.projectTitle?.en || '',
                es: this.currentProject.projectTitle?.es || ''
            };

            if (this.editor && this.currentProject.content) {
                this.editor.currentPage = projectId;

                // Normalize legacy string content into Quill Delta structures
                const normalizedContent: LocalizedContent = {
                    en: this.normalizeToDelta(this.currentProject.content.en),
                    es: this.normalizeToDelta(this.currentProject.content.es)
                };

                this.editor.setContentState(normalizedContent);
            }

            const statusToggle = document.getElementById('project-status-toggle') as HTMLInputElement | null;
            if (statusToggle) statusToggle.checked = Boolean(this.currentProject.isCurrent);

            const publishedToggle = document.getElementById('published-toggle') as HTMLInputElement | null;
            if (publishedToggle) publishedToggle.checked = Boolean(this.currentProject.published);

            const deleteBtn = document.getElementById('delete-btn');
            if (deleteBtn) deleteBtn.style.display = 'inline-block';

            this.syncLanguageUI('en');

        } catch (error) {
            console.error("Error loading project by ID:", error);
            createMessage({ messageBody: "Failed to load project details.", location: "main-message", type: "error" });
        }
    }

    private normalizeToDelta(rawContent: string | any[] | undefined | null): any[] {
        if (!rawContent) {
            return [];
        }

        // If it's already an array (Quill Delta operations)
        if (Array.isArray(rawContent)) {
            return rawContent;
        }

        // If legacy string content, convert to a single insert operation
        if (typeof rawContent === 'string') {
            return [{ insert: rawContent }];
        }

        return [];
    }

    private syncTitleInput(): void {
        const titleInput = document.getElementById('project-title-input') as HTMLInputElement | null;
        if (titleInput) {
            this.localizedTitles[this.activeLang] = titleInput.value.trim();
        }
    }

    private syncLanguageUI(lang: SupportedLanguage): void {
        this.activeLang = lang;

        const titleInput = document.getElementById('project-title-input') as HTMLInputElement | null;
        if (titleInput) {
            titleInput.value = this.localizedTitles[lang] || '';
        }

        if (this.editor) {
            const targetTab = (lang.slice(0, 2).toLowerCase() === 'es') ? 'es' : 'en';
            this.editor.switchLanguageTab(targetTab);
        }
    }

    private setupTabNavigation(): void {
        const btnEn = document.getElementById('tab-lang-en');
        const btnEs = document.getElementById('tab-lang-es');

        const handleTabSwitch = (targetLang: SupportedLanguage, targetBtn: HTMLElement, otherBtn: HTMLElement | null) => {
            if (this.activeLang === targetLang) return;

            // Persist title for outgoing language
            this.syncTitleInput();

            targetBtn.classList.add('active');
            if (otherBtn) otherBtn.classList.remove('active');

            this.syncLanguageUI(targetLang);
        };

        if (btnEn) {
            btnEn.addEventListener('click', (e: Event) => {
                e.preventDefault();
                handleTabSwitch('en', btnEn, btnEs);
            });
        }

        if (btnEs) {
            btnEs.addEventListener('click', (e: Event) => {
                e.preventDefault();
                handleTabSwitch('es', btnEs, btnEn);
            });
        }
    }

    private setUpCheckboxes(): void {
        const projectStatusCheckbox = document.getElementById("project-status-toggle") as HTMLElement | null;
        const projectPublishedCheckbox = document.getElementById("published-toggle") as HTMLElement | null;

        if (projectStatusCheckbox) {
            projectStatusCheckbox.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                const currentLabel = document.getElementById("current-status-label") as HTMLElement | null;
                if (this.currentProject) {
                    this.currentProject.isCurrent = target.checked;
                    if (currentLabel) {
                        currentLabel.textContent = target.checked ? "Current Project" : "Past Project";
                    }
                }
            });
        }

        if (projectPublishedCheckbox) {
            projectPublishedCheckbox.addEventListener("change", (e) => {
                const target = e.target as HTMLInputElement;
                const publishedLabel = document.getElementById("published-label") as HTMLElement | null;
                if (this.currentProject) {
                    this.currentProject.published = target.checked;
                    if (publishedLabel) {
                        publishedLabel.textContent = target.checked ? "Published" : "Unpublished";
                    }
                }
            });
        }
    }

    private setupSaveHandler(): void {
        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;

        saveBtn.addEventListener("click", async (e: Event) => {
            e.preventDefault();

            if (!this.currentProject) {
                createMessage({ messageBody: "No active project loaded to save", location: "main-message", type: "error" });
                return;
            }

            try {
                // Ensure current inputs/titles are updated in local state
                this.syncTitleInput();

                // Extract sanitized full localized contents (EN and ES) directly from editor instance
                const localizedContents: LocalizedContent = this.editor
                    ? await this.editor.prepareContentForSave()
                    : { en: [], es: [] };

                const projectToSave = new Project(
                    this.localizedTitles,
                    localizedContents,
                    this.currentProject.isCurrent,
                    this.currentProject.published,
                    this.currentProject.goalBar,
                    this.currentProject.orderIndex,
                    "",
                    Timestamp.now()
                );

                if (this.currentProjectId) {
                    projectToSave.id = this.currentProjectId;
                }

                const savedId = await saveProject(projectToSave);

                if (!this.currentProjectId) {
                    this.currentProjectId = savedId;
                    projectToSave.id = savedId;
                    this.currentProject = projectToSave;
                    if (this.editor) {
                        this.editor.currentPage = savedId;
                    }
                    window.history.replaceState({}, '', `?id=${savedId}`);

                    const deleteBtn = document.getElementById('delete-btn');
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                }

                createMessage({ messageBody: "Project saved successfully", location: "main-message", type: "check_circle" });

            } catch (error) {
                console.error("Failed to save project:", error);
                createMessage({ messageBody: "Error saving project changes.", location: "main-message", type: "error" });
            }
        });
    }

    private setupDeleteHandler(): void {
        const deleteBtn = document.getElementById('delete-btn');
        if (!deleteBtn) return;

        deleteBtn.style.display = this.currentProjectId ? 'inline-block' : 'none';

        deleteBtn.addEventListener("click", async () => {
            if (!this.currentProjectId) {
                console.warn("Delete blocked: No valid currentProjectId found.");
                return;
            }

            const projectTitle = this.localizedTitles[this.activeLang] || 'Project';

            const confirmed = await confirmDeleteModal(
                `Delete "${projectTitle}"?`,
                "Deleting this project will also delete its photos. This action cannot be undone."
            );

            if (confirmed) {
                try {
                    deleteBtn.innerText = "Deleting...";
                    (deleteBtn as HTMLButtonElement).disabled = true;

                    if (this.editor) {
                        await this.editor.deleteAllImages();
                    }

                    await deleteProject(this.currentProjectId);

                    storeMessage({ messageBody: "Project deleted successfully", location: "main-message", type: "delete" });
                    navigateTo('/impact');
                } catch (err) {
                    console.error("Delete failed:", err);
                    createMessage({ messageBody: "Failed to delete the project. Please try again.", location: "main-message", type: "error" });
                    deleteBtn.innerText = "Delete Project";
                    (deleteBtn as HTMLButtonElement).disabled = false;
                }
            }
        });
    }

    public destroy(): void {
        if (this.editor) {
            this.editor.destroy();
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EditProjectPage());
} else {
    new EditProjectPage();
}

const loading = document.getElementById("loading");
if (loading) loading.remove();
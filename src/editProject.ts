import { initializeApp } from './main.js';
import { TheEditor } from './modules/editor.js';
import { deleteProject, getProjectById, saveProject } from './firebase/firebaseService.js';
import { confirmDeleteModal, createMessage, storeMessage } from './modules/utils.js';
import { Project, type LocalizedString, type LocalizedContent, type SupportedLanguage } from './models.js';
import { navigateTo } from './modules/navigate.js';
import { Timestamp } from 'firebase/firestore';
import { getAuthenticatedUser, getUserRole } from './firebase/authService.js';

export class EditProjectPage {
    private editor: TheEditor | null = null;
    private currentProjectId: string | null = null;
    private currentProject: Project | null = null;
    private activeLang: SupportedLanguage = 'en';
    private localizedTitles: LocalizedString = { en: '', es: '' };
    private localizedContents: LocalizedContent = { en: null, es: null };

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            const user = await getAuthenticatedUser();

            if (!user) {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/impact");
                return;
            }
            const role = await getUserRole(user.uid);

            if (role !== 'admin') {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/impact");
                return;
            }
        } catch (authError) {
            console.error("Authorization check failed:", authError);
            storeMessage({ messageBody: "An error occurred verifying your permissions.", location: "main-message", type: "error" });
            navigateTo("/impact");
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        this.currentProjectId = urlParams.get('id') || urlParams.get('projectId');

        await initializeApp('Impact', this.currentProjectId ? 'Edit Project' : 'Create Project', {
            type: 'project',
            projectId: this.currentProjectId || undefined
        });

        const container = document.getElementById('editor-container');
        if (container) {
            this.editor = new TheEditor();
        } else {
            console.error('Editor container "#editor-container" not found.');
        }

        this.setupTabNavigation();
        this.setupSaveHandler();
        this.setupDeleteHandler();

        if (this.currentProjectId) {
            await this.loadProjectData(this.currentProjectId);
        } else {
            this.currentProject = new Project(
                { en: '', es: '' },
                { en: null, es: null },
                true,
                false,
                null,
                0,
                "",
                Timestamp.now()
            );
            this.loadLanguageView(this.activeLang);
        }
    }

    private async loadProjectData(projectId: string): Promise<void> {
        try {
            this.currentProject = await getProjectById(projectId);

            if (!this.currentProject) {
                createMessage({ messageBody: "Project not found.", location: "main-message", type: "error" });
                return;
            }

            if (this.editor) {
                this.editor.currentPage = projectId;
            }

            this.localizedTitles = {
                en: this.currentProject.projectTitle?.en || '',
                es: this.currentProject.projectTitle?.es || ''
            };

            this.localizedContents = {
                en: this.currentProject.content?.en || null,
                es: this.currentProject.content?.es || null
            };

            const statusToggle = document.getElementById('project-status-toggle') as HTMLInputElement | null;
            if (statusToggle) {
                statusToggle.checked = Boolean(this.currentProject.isCurrent);
            }

            const publishedToggle = document.getElementById('published-toggle') as HTMLInputElement | null;
            if (publishedToggle) {
                publishedToggle.checked = Boolean(this.currentProject.published);
            }

            const deleteBtn = document.getElementById('delete-post-btn');
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            this.loadLanguageView(this.activeLang);

        } catch (error) {
            console.error("Error loading project by ID:", error);
            createMessage({ messageBody: "Failed to load project details.", location: "main-message", type: "error" });
        }
    }

    private async saveCurrentTabState(): Promise<void> {
        const titleInput = document.getElementById('project-title-input') as HTMLInputElement | null;
        if (titleInput) {
            this.localizedTitles[this.activeLang] = titleInput.value.trim();
        }

        if (this.editor) {
            this.localizedContents[this.activeLang] = await this.editor.prepareContentForSave();
        }
    }

    private async loadLanguageView(lang: SupportedLanguage): Promise<void> {
        this.activeLang = lang;

        const titleInput = document.getElementById('project-title-input') as HTMLInputElement | null;
        if (titleInput) {
            titleInput.value = this.localizedTitles[lang] || '';
        }

        if (this.editor) {
            const content = this.localizedContents[lang];
            if (content) {
                if (typeof content === 'string') {
                    this.editor.setHTML(content);
                } else {
                    this.editor.quill.setContents(content);
                }
            } else {
                this.editor.quill.setText('');
            }
        }
    }

    private setupTabNavigation(): void {
        const btnEn = document.getElementById('tab-lang-en');
        const btnEs = document.getElementById('tab-lang-es');

        const handleTabSwitch = async (targetLang: SupportedLanguage, targetBtn: HTMLElement, otherBtn: HTMLElement | null) => {
            if (this.activeLang === targetLang) return;
            await this.saveCurrentTabState();

            targetBtn.classList.add('active');
            if (otherBtn) otherBtn.classList.remove('active');

            await this.loadLanguageView(targetLang);
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

    private setupSaveHandler(): void {
        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;

        saveBtn.addEventListener('click', async (e: Event) => {
            e.preventDefault();

            if (!this.currentProject) {
                createMessage({messageBody: "No active project loaded to save.", location: "main-message", type: "error"});
                return;
            }

            if (!this.editor) {
                createMessage({messageBody: "Editor instance missing.", location: "main-message", type: "error"});
                return;
            }

            const statusToggle = document.getElementById('project-status-toggle') as HTMLInputElement | null;
            const publishedToggle = document.getElementById('published-toggle') as HTMLInputElement | null;

            try {
                await this.saveCurrentTabState();

                const isCurrent = statusToggle ? statusToggle.checked : this.currentProject.isCurrent;
                const isPublished = publishedToggle ? publishedToggle.checked : this.currentProject.published;

                const projectToSave = new Project(
                    this.localizedTitles,
                    this.localizedContents,
                    isCurrent,
                    isPublished,
                    this.currentProject.goalBar ?? null,
                    this.currentProject.orderIndex ?? 0,
                    this.currentProjectId || undefined
                );

                const savedId = await saveProject(projectToSave);

                if (!this.currentProjectId) {
                    this.currentProjectId = savedId;
                    this.currentProject.id = savedId;
                    if (this.editor) {
                        this.editor.currentPage = savedId;
                    }
                    window.history.replaceState({}, '', `?id=${savedId}`);

                    const deleteBtn = document.getElementById('delete-post-btn');
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                }

                createMessage({messageBody: "Project saved successfully!", location: "main-message", type: "check_circle", autoCloseSeconds: 5});
            } catch (error) {
                console.error("Failed to save project:", error);
                createMessage({messageBody: "Error saving project changes.", location: "main-message", type: "error"});
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

            const projectTitle = this.currentProject?.getTitle?.(this.activeLang)
                || (typeof this.currentProject?.projectTitle === 'object' ? this.currentProject.projectTitle[this.activeLang] : '')
                || 'Project';

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

                    storeMessage({messageBody: "Project deleted successfully", location: "main-message", type: "delete"});
                    navigateTo('/impact');
                } catch (err) {
                    console.error("Delete failed:", err);
                    createMessage({messageBody: "Failed to delete the project. Please try again.", location: "main-message", type: "error"});
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
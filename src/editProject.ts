import { initializeApp } from './main.js';
import { TheEditor } from './modules/editor.js';
import { getProjectById, saveProject } from './firebase/firebaseService.js';
import { createMessage } from './modules/utils.js';
import { Project, type LocalizedString, type LocalizedContent, type SupportedLanguage } from './models.js';

export class EditProjectPage {
    private editor: TheEditor | null = null;
    private currentProjectId: string | null = null;
    private currentProject: Project | null = null;
    private activeLang: SupportedLanguage = 'en';

    // In-memory store for localized edits before persisting to Firestore
    private localizedTitles: LocalizedString = { en: '', es: '' };
    private localizedContents: LocalizedContent = { en: null, es: null };

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentProjectId = urlParams.get('id') || urlParams.get('projectId');

        // Run site setup and initialize editor configuration via main.ts
        await initializeApp('projects', 'Edit Project', {
            type: 'project',
            projectId: this.currentProjectId || undefined
        });

        const container = document.getElementById('editor-container');
        if (container) {
            this.editor = new TheEditor();
        } else {
            console.error('Editor container "#editor-container" not found.');
        }

        // Setup UI behaviors
        this.setupTabNavigation();
        this.setupSaveHandler();

        // Load project data if ID exists
        if (this.currentProjectId) {
            await this.loadProjectData(this.currentProjectId);
        } else {
            createMessage("No project ID provided in URL.", "main-message", "error");
        }
    }

    private async loadProjectData(projectId: string): Promise<void> {
        try {
            this.currentProject = await getProjectById(projectId);

            if (!this.currentProject) {
                createMessage("Project not found.", "main-message", "error");
                return;
            }

            if (this.editor) {
                this.editor.currentPage = projectId;
            }

            // Populate localized store from existing project
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

            // Load active language (English by default) into form and editor
            this.loadLanguageView(this.activeLang);

        } catch (error) {
            console.error("Error loading project by ID:", error);
            createMessage("Failed to load project details.", "main-message", "error");
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

            // Save active tab state before switching views
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
                createMessage("No active project loaded to save.", "main-message", "error");
                return;
            }

            if (!this.editor) {
                createMessage("Editor instance missing.", "main-message", "error");
                return;
            }

            const statusToggle = document.getElementById('project-status-toggle') as HTMLInputElement | null;
            const publishedToggle = document.getElementById('published-toggle') as HTMLInputElement | null;

            try {
                // Ensure active tab changes are captured before persisting
                await this.saveCurrentTabState();

                // Read toggles directly from the DOM state
                const isCurrent = statusToggle ? statusToggle.checked : this.currentProject.isCurrent;
                const isPublished = publishedToggle ? publishedToggle.checked : this.currentProject.published;

                const projectToSave = new Project(
                    this.localizedTitles,
                    this.localizedContents,
                    isCurrent,
                    isPublished,
                    this.currentProject.goalBar,
                    this.currentProject.orderIndex,
                    this.currentProjectId || undefined
                );

                const savedId = await saveProject(projectToSave);
                createMessage("Project saved successfully!", "main-message", "check_circle");
                console.log(`Project saved with ID: ${savedId}`);
            } catch (error) {
                console.error("Failed to save project:", error);
                createMessage("Error saving project changes.", "main-message", "error");
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
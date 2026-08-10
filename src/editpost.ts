import { initializeApp } from './main';
import { TheEditor } from './modules/editor';
import { deletePost, getPostById, savePost, getAllProjects } from './firebase/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { navigateTo } from './modules/navigate';
import { confirmDeleteModal, createMessage, storeMessage } from './modules/utils';
import { Post, Project, type LocalizedContent, type LocalizedString, type SupportedLanguage } from './models';
import { getAuthenticatedUser, getUserRole } from './firebase/authService';
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

export class EditPostPage {
    private editor: TheEditor | null = null;
    private currentPostId: string | null = null;
    private currentPost: Post | null = null;
    private activeLang: SupportedLanguage = 'en';
    private localizedTitles: LocalizedString = { en: '', es: '' };
    private postAuthor: string = "";
    private localizedContents: LocalizedContent = { en: null, es: null };

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
            this.currentPostId = urlParams.get('id') || urlParams.get('postId');

            // 1. Initialize layout & header/footer components
            await initializeApp("Blog", this.currentPostId ? 'Edit Post' : 'Create Post', {
                type: "post",
                postId: this.currentPostId || undefined
            });

            // 2. Authorization check
            const user = await getAuthenticatedUser();
            if (!user) {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/blog");
                return;
            }

            const role = await getUserRole(user.uid);
            if (role !== 'admin') {
                storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
                navigateTo("/blog");
                return;
            }

            // 3. Reveal the main edit section before mounting Quill
            const editSection = document.getElementById('edit-section');
            if (editSection) {
                editSection.classList.remove('hide');
            }

            // 4. Populate the "Link to Project" dropdown menu options
            await this.loadProjectOptions();

            // 5. Wait for editor container in DOM
            const container = await this.waitForElement('#editor-container');
            if (!container) {
                console.error('[EditPostPage] Could not find "#editor-container" in the DOM.');
                return;
            }

            // 6. Instantiate Quill Editor
            this.editor = new TheEditor();

            // 7. Setup handlers
            this.setupTabNavigation();
            this.setupSaveHandler();
            this.setupDeleteHandler();

            // 8. Load post or prepare blank post
            if (this.currentPostId) {
                await this.loadPostData(this.currentPostId);
            } else {
                this.currentPost = new Post(
                    { en: '', es: '' },
                    "",
                    Timestamp.now(),
                    Timestamp.now(),
                    { en: null, es: null },
                    ""
                );
                await this.loadLanguageView(this.activeLang);
            }

        } catch (err) {
            console.error("[EditPostPage] Initialization failed:", err);
            createMessage({ messageBody: "Failed to load page editor.", location: "main-message", type: "error" });
        } finally {
            // Remove loading screen after complete setup
            const loading = document.getElementById("loading");
            if (loading) loading.remove();
        }
    }

    private async loadProjectOptions(): Promise<void> {
        const linkToProjectSelect = document.getElementById('link-to-project') as HTMLSelectElement | null;
        if (!linkToProjectSelect) return;

        linkToProjectSelect.innerHTML = '';

        const none = document.createElement("option");
        none.text = "None";
        none.value = "";
        linkToProjectSelect.add(none);

        try {
            const projects: Project[] = await getAllProjects();
            projects.forEach((project) => {
                const option = document.createElement("option");
                option.text = project.projectTitle.en;
                if (project.id) option.value = project.id;
                linkToProjectSelect.add(option);
            });
        } catch (err) {
            console.error("Error loading projects:", err);
        }
    }

    private async loadPostData(postId: string): Promise<void> {
        try {
            this.currentPost = await getPostById(postId);

            if (!this.currentPost) {
                createMessage({ messageBody: "Post not found.", location: "main-message", type: "error" });
                return;
            }

            if (this.editor) {
                this.editor.currentPage = postId;
            }

            this.localizedTitles = {
                en: this.currentPost.postTitle?.en || '',
                es: this.currentPost.postTitle?.es || ''
            };

            this.postAuthor = this.currentPost.author || '';

            const authorInput = document.getElementById('author-input') as HTMLInputElement | null;
            if (authorInput) {
                authorInput.value = this.postAuthor;
            }

            const selectProject = document.getElementById('link-to-project') as HTMLSelectElement | null;
            if (selectProject && this.currentPost.linkedProjectId) {
                selectProject.value = this.currentPost.linkedProjectId;
            }

            this.localizedContents = {
                en: this.currentPost.content?.en || null,
                es: this.currentPost.content?.es || null
            };

            const deleteBtn = document.getElementById('delete-btn');
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
            }

            await this.loadLanguageView(this.activeLang);
        } catch (error) {
            console.error("Error loading post by ID:", error);
            createMessage({ messageBody: "Failed to load post details.", location: "main-message", type: "error" });
        }
    }

    private async saveCurrentTabState(): Promise<void> {
        const titleInput = document.getElementById('post-title-input') as HTMLInputElement | null;
        if (titleInput) {
            this.localizedTitles[this.activeLang] = titleInput.value.trim();
        }

        const authorInput = document.getElementById('author-input') as HTMLInputElement | null;
        if (authorInput) {
            this.postAuthor = authorInput.value.trim();
        }

        if (this.editor) {
            this.localizedContents[this.activeLang] = await this.editor.prepareContentForSave();
        }
    }

    private async loadLanguageView(lang: SupportedLanguage): Promise<void> {
        this.activeLang = lang;

        const titleInput = document.getElementById('post-title-input') as HTMLInputElement | null;
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

        saveBtn.addEventListener("click", async (e: Event) => {
            e.preventDefault();

            if (!this.currentPost) {
                createMessage({ messageBody: "No active post loaded to save.", location: "main-message", type: "error" });
                return;
            }

            if (!this.editor) {
                createMessage({ messageBody: "Editor instance missing.", location: "main-message", type: "error" });
                return;
            }

            try {
                await this.saveCurrentTabState();

                const selectProject = document.getElementById('link-to-project') as HTMLSelectElement | null;
                const linkedProjectId = selectProject ? selectProject.value : '';

                const postToSave = new Post(
                    this.localizedTitles,
                    this.postAuthor,
                    this.currentPost?.publishDate ?? Timestamp.now(),
                    Timestamp.now(),
                    this.localizedContents,
                    linkedProjectId
                );

                if (this.currentPostId) {
                    postToSave.id = this.currentPostId;
                }

                const savedId = await savePost(postToSave);

                if (!this.currentPostId) {
                    this.currentPostId = savedId;
                    postToSave.id = savedId;
                    this.currentPost = postToSave;
                    if (this.editor) {
                        this.editor.currentPage = savedId;
                    }
                    window.history.replaceState({}, '', `?id=${savedId}`);

                    const deleteBtn = document.getElementById('delete-btn');
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                }

                createMessage({ messageBody: "Post saved successfully.", location: "main-message", type: "check_circle" });

            } catch (error) {
                console.error("Failed to save post:", error);
                createMessage({ messageBody: "Error saving post changes.", location: "main-message", type: "error" });
            }
        });
    }

    private setupDeleteHandler(): void {
        const deleteBtn = document.getElementById('delete-btn');
        if (!deleteBtn) return;

        deleteBtn.style.display = this.currentPostId ? 'inline-block' : 'none';

        deleteBtn.addEventListener("click", async () => {
            if (!this.currentPostId) {
                console.warn("Delete blocked: No valid currentPostId found.");
                return;
            }

            const postTitle = this.currentPost?.getTitle?.(this.activeLang)
                || (typeof this.currentPost?.postTitle === 'object' ? this.currentPost.postTitle[this.activeLang] : '')
                || 'Post';

            const confirmed = await confirmDeleteModal(
                `Delete "${postTitle}"?`,
                "Deleting this post will also delete its photos. This action can not be undone"
            );

            if (confirmed) {
                try {
                    deleteBtn.innerText = "Deleting...";
                    (deleteBtn as HTMLButtonElement).disabled = true;

                    if (this.editor) {
                        await this.editor.deleteAllImages();
                    }

                    await deletePost(this.currentPostId);
                    storeMessage({ messageBody: "Post deleted successfully", location: "main-message", type: "delete" });
                    navigateTo('/blog');
                } catch (err) {
                    console.error("Delete failed:", err);
                    createMessage({messageBody: "Failed to delete the post. Please try again.", location: "main-message", type: "error"});
                    deleteBtn.innerText = "Delete Post";
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
    document.addEventListener('DOMContentLoaded', () => new EditPostPage());
} else {
    new EditPostPage();
}
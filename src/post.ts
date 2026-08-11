import { initializeApp } from './main';
import { getPostById } from './firebase/firebaseService';
import Quill from 'quill';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import { navigateTo } from './modules/navigate';
import { createButton, createGiveButterWidget, formatDate, storeMessage } from './modules/utils';
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import i18n, { getResolvedLanguage, updateContent } from './modules/i18n';
import { registerCustomQuillBlots } from './modules/quillBlots';
import type { Post } from './models';
import { isEmptyDelta } from './modules/editor';

registerCustomQuillBlots();

let activePost: Post | null = null;
let quillViewer: Quill | null = null;

function getCurrentLang(): 'en' | 'es' {
    const lang = getResolvedLanguage() || i18n.language || document.documentElement.lang || localStorage.getItem('i18nextLng') || 'en';
    const resolved = lang.toLowerCase().startsWith('es') ? 'es' : 'en';
    console.log('getCurrentLang resolved:', resolved, '| Raw sources:', {
        getResolvedLanguage: getResolvedLanguage(),
        i18nLanguage: i18n.language,
        docLang: document.documentElement.lang,
        localStorage: localStorage.getItem('i18nextLng')
    });
    return resolved;
}

function isEmptyContent(content: any): boolean {
    if (content === null || content === undefined) return true;

    // Handle plain strings / HTML strings / JSON strings
    if (typeof content === "string") {
        const trimmed = content.trim();
        if (!trimmed || trimmed === '<p><br></p>' || trimmed === '<p></p>') return true;
        try {
            const parsed = JSON.parse(trimmed);
            return isEmptyContent(parsed);
        } catch {
            return false;
        }
    }

    // Handle standard Quill Delta object: { ops: [...] }
    if (typeof content === 'object' && !Array.isArray(content)) {
        if (content.ops && Array.isArray(content.ops)) {
            return isEmptyDelta(content);
        }
        // If it's a plain non-array object without ops, check if keys exist
        return Object.keys(content).length === 0;
    }

    // Handle Quill Delta ops stored directly as an Array: [{ insert: "...\n" }]
    if (Array.isArray(content)) {
        if (content.length === 0) return true;
        
        // A single empty newline op [{ insert: "\n" }] or [{ insert: "\n\n" }] is empty
        if (content.length === 1 && typeof content[0]?.insert === 'string') {
            const insertedText = content[0].insert.trim();
            return insertedText === '';
        }
        
        return false;
    }

    return false;
}

function setViewerContent(content: any) {
    if (!quillViewer) {
        console.error('quillViewer is null');
        return;
    }
    if (!content) {
        console.error('content is null or undefined');
        return;
    }

    quillViewer.setContents([] as any);

    // Handle Delta ops stored directly as an Array
    if (Array.isArray(content)) {
        try {
            quillViewer.setContents({ ops: content } as any);
            return;
        } catch (e) {
            console.error("Error passing Delta array to quillViewer.setContents():", e);
        }
    }

    // Handle Delta object { ops: [...] }
    if (typeof content === 'object') {
        try {
            quillViewer.setContents(content);
            return;
        } catch (e) {
            console.error("Error passing Delta object to quillViewer.setContents():", e);
        }
    }

    if (typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                setViewerContent(parsed);
                return;
            } catch (e) {
                console.warn('JSON.parse failed on JSON-like string, falling back to HTML paste:', e);
            }
        }
        quillViewer.clipboard.dangerouslyPasteHTML(trimmed);
    }
}

function getLocalizedRawContent(post: Post, lang: 'en' | 'es'): any {
    const altLang: 'en' | 'es' = lang === 'es' ? 'en' : 'es';

    if (post.content && typeof post.content === 'object') {
        const primary = (post.content as Record<string, any>)[lang];
        const isPrimaryEmpty = isEmptyContent(primary);

        if (!isPrimaryEmpty) return primary;

        const fallback = (post.content as Record<string, any>)[altLang];
        const isFallbackEmpty = isEmptyContent(fallback);

        if (!isFallbackEmpty) return fallback;
    } else if (post.content) {
        return post.content;
    }
    return null;
}

function initQuillViewer() {
    const container = document.getElementById('viewer-container');
    if (container && !quillViewer) {
        quillViewer = new Quill(container, {
            theme: 'bubble',
            readOnly: true,
            modules: {
                toolbar: false
            }
        });
    }
}

function renderLocalizedPost() {
    if (!activePost) return;

    initQuillViewer();

    const currentLang = getCurrentLang();
    const displayTitle = activePost.getTitle(currentLang);
    const displayContent = getLocalizedRawContent(activePost, currentLang);
    document.title = `${displayTitle} - Guatemalta USA`;

    const titleElem = document.getElementById('display-title');
    if (titleElem) {
        titleElem.innerText = displayTitle;
    }

    const postInfoElem = document.getElementById("post-info") as HTMLElement;
    if (postInfoElem) {
        postInfoElem.textContent = i18n.t('post_by_date', { 
            author: activePost.author || "Admin", 
            date: formatDate(activePost.publishDate, false) 
        });
    }

    if (displayContent) {
        setViewerContent(displayContent);
        setTimeout(() => {
            bindDonateButtons();
        }, 0);
    }
}

function bindDonateButtons() {
    const donateButtons = document.querySelectorAll('#viewer-container button.action-link[data-id]');

    donateButtons.forEach((btn) => {
        const widgetId = btn.getAttribute('data-id');
        const idTag = btn.querySelector('.donate-id-tag');
        if (idTag) idTag.remove();
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (widgetId) {
                openGivebutterModal(widgetId);
            }
        });
    });
}

function openGivebutterModal(widgetId: string) {
    if (document.getElementById('gb-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'gb-modal-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.75); display: flex; align-items: center;
        justify-content: center; z-index: 99999; backdrop-filter: blur(4px);
        padding: 20px; box-sizing: border-box;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        position: relative; background: #ffffff; width: 90%; max-width: 500px;
        max-height: 90vh; overflow-y: auto;
        padding: 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.style.cssText = `
        position: absolute; top: 12px; right: 16px; background: none;
        border: none; font-size: 28px; cursor: pointer; color: #6b7280; line-height: 1; z-index: 1;
    `;

    const closeModal = () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.classList.remove("noScroll");
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            closeModal();
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = modalContent.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), givebutter-widget'
            );
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            }
        }
    };

    window.addEventListener("keydown", handleKeyDown);

    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    const liveWidget = createGiveButterWidget(widgetId, "button");

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(liveWidget);
    overlay.appendChild(modalContent);

    document.body.classList.add("noScroll");
    document.body.appendChild(overlay);

    const gb = (window as any).Givebutter;
    if (gb && typeof gb.init === 'function') {
        gb.init();
    }

    closeBtn.focus();
}

async function setUpPostView() {
    const params = new URLSearchParams(window.location.search);
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;
    const id = params.get('id');

    if (!id) {
        storeMessage({
            messageBody: "Invalid post url. Please try again",
            location: "main-message",
            type: "error"
        });
        navigateTo("/blog");
        return;
    }

    await initializeApp("Blog", "View Post", null);

    const post = await getPostById(id);

    if (!post) {
        storeMessage({ messageBody: "Post not found", location: "main-message", type: "error", i18n: "post_not_found" });
        navigateTo("/blog");
        return;
    }

    activePost = post;

    const postContainer = document.getElementById("post-container") as HTMLElement;
    const loading = document.getElementById("loading");

    if (loading) loading.remove();
    if (postContainer) postContainer.classList.remove("hide");

    const adminActions = document.getElementById('admin-actions');

    auth.onAuthStateChanged(async (user) => {
        if (user && adminActions) {
            const role = await getUserRole(user.uid);
            if (role === 'admin') {
                adminActions.innerHTML = '';
                adminActions.classList.remove("hide");

                const editButton = createButton({ buttonText: "Edit Post", buttonType: "button", buttonId: "edit-post", buttonClass: "accent-button", icon: "edit" });
                editButton.addEventListener("click", () => {
                    if (post.id) {
                        navigateTo("/blog/editpost", { params: { id: id } });
                    } else {
                        console.error("Cannot edit a post without an ID");
                    }
                });

                adminActions.append(editButton);
            }
        }
    });

    renderLocalizedPost();

    if (lastUpdatedDiv) {
        lastUpdatedDiv.innerText = i18n.t('last_updated', { timestamp: formatDate(post.lastUpdated, true) });
    }
    updateContent();
}

i18n.on('languageChanged', () => {
    renderLocalizedPost();
    updateContent();
});

async function init() {
    await setUpPostView();
    updateContent();
}

init();
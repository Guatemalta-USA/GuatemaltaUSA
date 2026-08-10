import { initializeApp } from './main';
import { getPostById } from './firebase/firebaseService';
import Quill from 'quill';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import { navigateTo } from './modules/navigate';
import { createButton, createGiveButterWidget, storeMessage } from './modules/utils';
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import i18n from './modules/i18n';

async function setupPostView() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    if (!id) {
        navigateTo("/blog");
        return;
    }

    await initializeApp('Blog', 'View Post', null);

    const post = await getPostById(id);
    if (!post) {
        storeMessage({messageBody: "Post not found", location: "main-message", type: "error", i18n: "post_not_found"});
        navigateTo("/blog");
    } else {
        const adminActions = document.getElementById('admin-actions');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const role = await getUserRole(user.uid);
                if (role === 'admin' && adminActions) {
                    // Show the admin container
                    adminActions.classList.remove('hide');
                    const editButton = createButton({ buttonText: "Edit Post", buttonType: "button", buttonId: "edit-post", buttonClass: "accent-button", icon: "edit"});
                    editButton.addEventListener('click', () => {
                        if (post.id) {
                            navigateTo('/blog/editpost', { params: { id: post.id } });
                        } else {
                            console.error("Cannot edit a post without an ID");
                        }
                    });
                    adminActions.append(editButton);
                }
            }
        });

        // Update UI
        document.title = `${post.postTitle} - Guatemalta USA`;
        const titleElem = document.getElementById('display-title');
        const postInfoElem = document.getElementById("post-info");
        const postContainer = document.getElementById("post-container") as HTMLElement;
        const loading = document.getElementById("loading");
        if (titleElem) titleElem.innerText = post.postTitle;
        if (postInfoElem) postInfoElem.innerText = i18n.t('post_by_date', { author: post["author"], date: post.publishDate.toDate().toLocaleDateString() });

        // Initialize Read-Only Quill
        const viewer = new Quill('#viewer-container', {
            theme: 'bubble',
            readOnly: true,
            modules: { toolbar: false }
        });

        viewer.setContents(post.content);

        // Target all action-link buttons that contain a Givebutter ID
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

        function openGivebutterModal(widgetId: string) {
            if (document.getElementById('gb-modal-overlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'gb-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.75); display: flex; align-items: center;
                justify-content: center; z-index: 99999; backdrop-filter: blur(4px);
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                position: relative; background: #ffffff; width: 90%; max-width: 500px;
                padding: 24px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
            `;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                position: absolute; top: 12px; right: 16px; background: none;
                border: none; font-size: 28px; cursor: pointer; color: #6b7280; line-height: 1;
            `;

            const closeModal = () => overlay.remove();
            closeBtn.onclick = closeModal;
            overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

            const liveWidget = createGiveButterWidget(widgetId, "button");

            modalContent.appendChild(closeBtn);
            modalContent.appendChild(liveWidget);
            overlay.appendChild(modalContent);
            document.body.appendChild(overlay);

            const gb = (window as any).Givebutter;
            if (gb && typeof gb.init === 'function') {
                gb.init();
            }
        }

        const lastUpdatedDate = post.lastUpdated.toDate();
        const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdatedDiv.innerText = i18n.t('last_updated', {timestamp: lastUpdatedStr});

        if (loading) loading.remove();
        postContainer.classList.remove("hide");
    }
}

setupPostView();
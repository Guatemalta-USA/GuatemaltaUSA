import Quill from "quill";
import { getUserRole } from "./firebase/authService";
import { auth } from "./firebase/firebase";
import { getPostsWithLinkedProjectId, getProjectById } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";
import { createButton, createGiveButterWidget, createLink, makeElement, storeMessage } from "./modules/utils";

async function setUpProjectView() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const linkedPostsDiv = document.getElementById("linked-posts") as HTMLElement;
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    if (!id) {
        navigateTo("/impact/currentprojects");
        return;
    }

    await initializeApp("Impact", "View Project", null);

    const project = await getProjectById(id);
    if (!project) {
        storeMessage("Project not found", "main-message", "error");
        navigateTo("/impact/currentprojects");
    } else {
        const adminActions = document.getElementById('admin-actions');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const role = await getUserRole(user.uid);
                if (role === 'admin' && adminActions) {
                    adminActions.classList.remove("hide");
                    const editButton = createButton("Edit Project", "button", "edit-project", "accent-button", "edit");
                    editButton.addEventListener("click", () => {
                        if (project.id) {
                            navigateTo("/impact/editproject", { params: { id: id } });
                        } else {
                            console.error("Cannot edit a project without an ID");
                        }
                    });
                    adminActions.appendChild(editButton);
                }
            }
        });

        // Update UI
        document.title = `${project.projectTitle} - Guatemalta USA`;
        const titleElem = document.getElementById('display-title');
        const projectContainer = document.getElementById("project-container") as HTMLElement;
        const loading = document.getElementById("loading");

        if (titleElem) titleElem.innerText = project.projectTitle;
        const linkedPosts = await getPostsWithLinkedProjectId(id);
        if (linkedPosts.length > 0) {
            linkedPosts.forEach((post) => {
                let postId = "";
                if (post.id) {
                    postId = post.id;
                }
                const postArticle = makeElement("article", postId, "", null);
                const postLink = makeElement("a", null, "post-link", null);
                postLink.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }))
                const postTitle = makeElement("h2", null, null, post.postTitle);
                postLink.appendChild(postTitle);
                postArticle.appendChild(postLink);
                const postInfo = makeElement("h3", null, null, `By ${post.author} on ${post.publishDate.toDate().toLocaleDateString()}`);
                postArticle.appendChild(postInfo);
                const firstP = post.getFirstParagraph();
                const firstPElm = makeElement("p", null, null, firstP);
                postArticle.appendChild(firstPElm);
                const readMore = createLink("Read More...", "", false);
                readMore.classList.add("post-link");
                readMore.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));
                postArticle.appendChild(readMore);
                linkedPostsDiv.appendChild(postArticle);
            });
        } else {
            linkedPostsDiv.remove();
        }

        // Initialize Read-Only Quill
        const viewer = new Quill('#viewer-container', {
            theme: 'bubble',
            readOnly: true,
            modules: { toolbar: false }
        });

        viewer.setContents(project.content);

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

        const lastUpdatedDate = project.lastUpdated.toDate();
        const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdatedDiv.innerText = `Last updated: ${lastUpdatedStr}`;
        if (loading) loading.remove();
        projectContainer.classList.remove("hide");
        linkedPostsDiv.classList.remove("hide");
    }
}

setUpProjectView();
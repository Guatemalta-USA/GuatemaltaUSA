import Quill from "quill";
import 'quill/dist/quill.snow.css';
import { registerCustomQuillBlots } from "./modules/quillBlots";
import { getUserRole } from "./firebase/authService";
import { auth } from "./firebase/firebase";
import { getPostsWithLinkedProjectId, getProjectById, saveProject } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";
import { createButton, createGiveButterWidget, createLink, makeElement, promptModal, storeMessage } from "./modules/utils";
import { Timestamp } from "firebase/firestore/lite";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import i18n, { updateContent, getResolvedLanguage } from "./modules/i18n";
import { Project } from "./models";

// Register custom blots so the viewer understands 'givebutter', 'actionLink', etc.
registerCustomQuillBlots();

let activeProject: Project | null = null;
let quillViewer: Quill | null = null;

// Ensure Quill viewer is initialized in read-only mode
function initQuillViewer() {
    const container = document.getElementById('viewer-container');
    if (container && !quillViewer) {
        quillViewer = new Quill(container, {
            theme: 'snow',
            readOnly: true,
            modules: {
                toolbar: false
            }
        });
    }
}

function renderLocalizedProject() {
    if (!activeProject) return;

    initQuillViewer();

    const currentLang = (getResolvedLanguage() || 'en').slice(0, 2) as 'en' | 'es';
    const displayTitle = activeProject.projectTitle[currentLang] || activeProject.projectTitle.en || activeProject.projectTitle.es || '';
    const displayContent = activeProject.content[currentLang] || activeProject.content.en || activeProject.content.es;

    document.title = `${displayTitle} - Guatemalta USA`;
    const titleElem = document.getElementById('display-title');
    if (titleElem) titleElem.innerText = displayTitle;

    if (quillViewer && displayContent) {
        try {
            const parsedContent = typeof displayContent === 'string' ? JSON.parse(displayContent) : displayContent;
            quillViewer.setContents(parsedContent);
        } catch (e) {
            if (typeof displayContent === 'string') {
                quillViewer.clipboard.dangerouslyPasteHTML(displayContent);
            }
        }
        
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

async function setUpProjectView() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const linkedPostsDiv = document.getElementById("linked-posts") as HTMLElement;
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    if (!id) {
        navigateTo("/impact");
        return;
    }

    await initializeApp("Impact", "View Project", null);

    const project = await getProjectById(id);
    if (!project) {
        storeMessage("Project not found", "main-message", "error");
        navigateTo("/impact");
        return;
    }

    activeProject = project;

    const projectContainer = document.getElementById("project-container") as HTMLElement;
    const loading = document.getElementById("loading");

    if (loading) loading.remove();
    if (projectContainer) projectContainer.classList.remove("hide");
    if (linkedPostsDiv) linkedPostsDiv.classList.remove("hide");

    const adminActions = document.getElementById('admin-actions');

    auth.onAuthStateChanged(async (user) => {
        if (user && adminActions) {
            const role = await getUserRole(user.uid);
            if (role === 'admin') {
                adminActions.innerHTML = ''; // Prevent duplicate buttons on re-render
                adminActions.classList.remove("hide");

                const editButton = createButton({ buttonText: "Edit Project", buttonType: "button", buttonId: "edit-project", buttonClass: "accent-button", icon: "edit", i18n: "edit_project" });
                editButton.addEventListener("click", () => {
                    if (project.id) {
                        navigateTo("/impact/editproject", { params: { id: id } });
                    } else {
                        console.error("Cannot edit a project without an ID");
                    }
                });

                const addGoalBarBtn = createButton({ buttonText: "Add Goal Bar", buttonType: "button", buttonId: "goal-bar", buttonClass: "accent-button", icon: "add", i18n: "add_goal_bar" });
                addGoalBarBtn.addEventListener("click", async () => {
                    const goalBar = await promptModal(
                        "Enter the widget ID of the goal bar\n(found in the embed code of the Goal bar widget)",
                        ["Widget ID"],
                        "add",
                        false
                    );
                    if (goalBar) {
                        const goalBarId = goalBar[0];
                        if (goalBarId.trim() !== "") {
                            project.goalBar = goalBarId;
                            project.updatedAt = Timestamp.now()
                            try {
                                await saveProject(project);
                                storeMessage("Goal Bar added", "main-message", "check_circle");
                                window.location.reload();
                            } catch (error: any) {
                                storeMessage(error, "main-message", "error");
                            }
                        }
                    }
                });

                adminActions.append(editButton, addGoalBarBtn);
            }
        }
    });

    if (project.goalBar) {
        const goalBarContainer = document.getElementById("goal-bar-container") as HTMLElement;
        if (goalBarContainer) {
            const goalBar = createGiveButterWidget(project.goalBar, "goal bar");
            goalBarContainer.appendChild(goalBar);
        }
    }

    const linkedPosts = await getPostsWithLinkedProjectId(id);
    if (linkedPosts && linkedPosts.length > 0) {
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
            readMore.setAttribute("data-i18n", "read_more");
            readMore.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));
            postArticle.appendChild(readMore);
            linkedPostsDiv.appendChild(postArticle);
        });
    } else if (linkedPostsDiv) {
        linkedPostsDiv.remove();
    }

    quillViewer = new Quill('#viewer-container', {
        theme: 'bubble',
        readOnly: true,
        modules: { toolbar: false }
    });

    renderLocalizedProject();

    const rawUpdatedAt = project.updatedAt;
    const lastUpdatedDate = rawUpdatedAt && typeof (rawUpdatedAt as any).toDate === 'function'
        ? (rawUpdatedAt as any).toDate()
        : (rawUpdatedAt instanceof Date ? rawUpdatedAt : new Date());

    const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    if (lastUpdatedDiv) {
        lastUpdatedDiv.innerText = i18n.t('last_updated', { timestamp: lastUpdatedStr });
    }
    updateContent();
}

i18n.on('languageChanged', () => {
    renderLocalizedProject();
    updateContent();
});

async function init() {
    await setUpProjectView();
    updateContent();
}

init();
import Quill from "quill";
import 'quill/dist/quill.snow.css';
import { registerCustomQuillBlots } from "./modules/quillBlots";
import { getUserRole } from "./firebase/authService";
import { auth } from "./firebase/firebase";
import { getCampaignTotalById, getPostsWithLinkedProjectId, getProjectById, saveProject } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";
import { createButton, createGiveButterWidget, createLink, formatDate, makeElement, promptModal, storeMessage } from "./modules/utils";
import { Timestamp } from "firebase/firestore/lite";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import i18n, { updateContent, getResolvedLanguage } from "./modules/i18n";
import { Project } from "./models";
import { isEmptyDelta } from "./modules/editor";

// Register custom blots so the viewer understands 'givebutter', 'actionLink', etc.
registerCustomQuillBlots();

let activeProject: Project | null = null;
let quillViewer: Quill | null = null;

const currentLang = (getResolvedLanguage() || 'en').slice(0, 2) as 'en' | 'es';

// Helper function to check if Delta or HTML string content is considered empty
function isEmptyContent(content: any): boolean {
    if (!content) return true;

    // Check for stringified JSON Delta or raw HTML/text
    if (typeof content === 'string') {
        const trimmed = content.trim();
        if (!trimmed || trimmed === '<p><br></p>' || trimmed === '<p></p>') return true;
        try {
            const parsed = JSON.parse(trimmed);
            return isEmptyDelta(parsed);
        } catch {
            return false;
        }
    }

    // Check for structured Delta object
    if (typeof content === 'object') {
        return isEmptyDelta(content);
    }

    return false;
}

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

    // Title Fallback: check current language -> English -> Spanish -> empty string
    const titleLang = (activeProject.projectTitle[currentLang] && activeProject.projectTitle[currentLang].trim() !== '')
        ? currentLang
        : 'en';
    const displayTitle = activeProject.projectTitle[titleLang] || activeProject.projectTitle.en || activeProject.projectTitle.es || '';

    // Content Fallback: if current language is empty/missing, fall back to English
    const rawContent = activeProject.content[currentLang];
    const displayContent = !isEmptyContent(rawContent)
        ? rawContent
        : activeProject.content.en || activeProject.content.es;

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
                    firstElement.focus();
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

async function setUpProjectView() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const linkedPostsDiv = document.getElementById("linked-posts") as HTMLElement;
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    if (!id) {
        storeMessage({ messageBody: "Project not found", location: "main-message", type: "error", i18n: "project_not_found" });
        navigateTo("/impact");
        return;
    }

    await initializeApp("Impact", "View Project", null);

    const project = await getProjectById(id);
    if (!project) {
        storeMessage({ messageBody: "Project not found", location: "main-message", type: "error", i18n: "project_not_found" });
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
                                storeMessage({ messageBody: "Goal Bar added", location: "main-message", type: "check_circle" });
                                window.location.reload();
                            } catch (error: any) {
                                storeMessage({ messageBody: error, location: "main-message", type: "error" });
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
            if (id === "a-gift-of-sight-restoring-vision-and-hope-in-guatemala") {
                const totalRaised = await getCampaignTotalById(id);
                const customGoalBarContainer = makeElement("div", null, "custom-goal-bar", null);
                const surgeriesSponsored = makeElement("h2", null, null, `Surgeries sponsored: ${Math.floor(totalRaised / 85)}/20`);
                const totalRaisedP = makeElement("p", null, null, `Total raised: $${totalRaised.toLocaleString('en-US')}`);
                customGoalBarContainer.append(surgeriesSponsored, totalRaisedP);
                goalBarContainer.appendChild(customGoalBarContainer);
            } else {
                const goalBar = createGiveButterWidget(project.goalBar, "goal bar");
                goalBarContainer.appendChild(goalBar);
            }
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
            const postTitle = makeElement("h2", null, null, post.postTitle[currentLang]);
            postLink.appendChild(postTitle);
            postArticle.appendChild(postLink);
            const postInfo = makeElement("h3", null, null, `By ${post.author} on ${formatDate(post.publishDate, false)}`);
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

    if (lastUpdatedDiv) {
        lastUpdatedDiv.innerText = i18n.t('last_updated', { timestamp: formatDate(project.updatedAt, true) });
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
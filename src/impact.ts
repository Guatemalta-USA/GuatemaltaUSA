import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { getProjectsByStatus } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Project } from "./models.js";
import { navigateTo } from "./modules/navigate.js";
import { createButton, createLink, makeElement } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import { updateContent } from "./modules/i18n.js";

await initializeApp("Impact", "Current Projects", null);

const container = document.getElementById("projects-container") as HTMLElement;
const loading = document.getElementById("loading");
const actionButtons = document.getElementById("action-buttons") as HTMLElement;
const tabs = document.getElementById("tab-navigation") as HTMLElement;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const role = await getUserRole(user.uid);
        if (role === "admin") {
            const newProjectButton = createButton({buttonText: "Start New Project", buttonType: "button", buttonId: "new-project", buttonClass: "accent-button", icon: "add", i18n: "start_new_project_btn"});
            newProjectButton.addEventListener("click", () => navigateTo("/impact/editproject"));
            actionButtons.appendChild(newProjectButton);
        }
    }
});


const projects: Record<string, Project[]> = {
    "current": await getProjectsByStatus(true),
    "past": await getProjectsByStatus(false)
}

const currentTabBtn = createButton({buttonText: "Current Projects", buttonType: "button", buttonId: "current-tab", buttonClass: "tab-btn active", i18n: "current_projects"});
const pastTabBtn = createButton({buttonText: "Past Projects", buttonType: "button", buttonId: "past-tab", buttonClass: "tab-btn", i18n: "past_projects"});

function setActiveTab(selectedTab: HTMLElement) {
    currentTabBtn.classList.remove("active");
    pastTabBtn.classList.remove("active");
    selectedTab.classList.add("active");
}

currentTabBtn.addEventListener("click", async () => {
    setActiveTab(currentTabBtn);
    await loadProjects("current");
    updateContent();
});

pastTabBtn.addEventListener("click", async () => {
    setActiveTab(pastTabBtn);
    await loadProjects("past");
    updateContent();
});

tabs.append(currentTabBtn, pastTabBtn);

async function loadProjects(status: string) {
    container.innerHTML = "";
    const projectsToDisplay = projects[status];
    try {
        if (projectsToDisplay.length === 0) {
            const noProjects = makeElement("p", null, null, "No projects yet. Check back soon!");
            container.appendChild(noProjects);
        } else {
            const projectsDiv = projectsToDisplay.reduce((acc: HTMLElement, project: Project) => {
                const projectId = project.id ? project.id : "";
                const projectArticle = makeElement("article", projectId, null, null);
                const projectLink = makeElement("a", null, "post-link", null);
                projectLink.addEventListener("click", () => navigateTo("/impact/project", { params: { id: projectId } }));
                const projectTitle = makeElement("h2", null, null, project.projectTitle);
                projectLink.appendChild(projectTitle);
                projectArticle.appendChild(projectLink);
                const firstP = project.getFirstParagraph();
                const firstPElm = makeElement("p", null, null, firstP);
                projectArticle.appendChild(firstPElm);
                const readMore = createLink("Read More...", "", false);
                readMore.setAttribute("data-i18n", "read_more");
                readMore.classList.add("post-link");
                readMore.addEventListener("click", () => navigateTo("/impact/project", { params: { id: projectId } }));
                projectArticle.appendChild(readMore);
                acc.appendChild(projectArticle);
                return acc;
            }, document.createElement("div"));
            container.appendChild(projectsDiv);
        }
        if (loading) loading.remove();
        container.classList.remove("hide");
    } catch (err) {
        container.innerHTML = "<p>Error loading projects.</p>";
    }
}
loadProjects("current")
tabs.classList.remove("hide");
updateContent();

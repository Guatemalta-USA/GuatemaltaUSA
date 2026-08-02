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

await initializeApp("Impact", "Current Projects", null);

const container = document.getElementById("projects-container") as HTMLElement;
const loading = document.getElementById("loading");
const actionButtons = document.getElementById("action-buttons") as HTMLElement;
const tabs = document.getElementById("tab-navigation") as HTMLElement;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const role = await getUserRole(user.uid);
        if (role === "admin") {
            const newProjectButton = createButton("Start New Project", "button", "new-project", "accent-button", "add");
            newProjectButton.addEventListener("click", () => navigateTo("/impact/editproject"));
            actionButtons.appendChild(newProjectButton);
        }
    }
});


const projects: Record<string, Project[]> = {
    "current": await getProjectsByStatus(true),
    "past": await getProjectsByStatus(false)
}

const currentTabBtn = createButton("Current Projects", "button", "tab-sponsorships", "tab-btn active");
const pastTabBtn = createButton("Past Projects", "button", "tab-donors", "tab-btn");

function setActiveTab(selectedTab: HTMLElement) {
    currentTabBtn.classList.remove("active");
    pastTabBtn.classList.remove("active");
    selectedTab.classList.add("active");
}

currentTabBtn.addEventListener("click", async () => {
    setActiveTab(currentTabBtn);
    await loadProjects("current");
});

pastTabBtn.addEventListener("click", async () => {
    setActiveTab(pastTabBtn);
    await loadProjects("past");
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

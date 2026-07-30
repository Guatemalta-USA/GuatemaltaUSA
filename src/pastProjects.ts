import { getProjectsByStatus } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Project } from "./models.js";
import { navigateTo } from "./modules/navigate.js";
import { createButton, createLink, makeElement } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

async function setUpCurrentProjectsPage() {
    await initializeApp("Impact", "Current Projects", null);

    const container = document.getElementById("projects-container");
    const loading = document.getElementById("loading");
    const buttons = document.getElementById("buttons");

    if (buttons) {
        const currentButton = createButton("Current Projects", "button", "current", "accent-button");
        currentButton.addEventListener("click", () => navigateTo("/impact/currentprojects"));
        buttons.appendChild(currentButton);
    }

    if (!container) return;

    try {
        const currentProjects: Project[] = await getProjectsByStatus(false);

        if (currentProjects.length === 0) {
            const noProjects = makeElement("p", null, null, "No projects yet. Check back soon!");
            container.appendChild(noProjects);
        } else {
            const currentProjectsDiv = currentProjects.reduce((acc: HTMLElement, project: Project) => {
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
            container.appendChild(currentProjectsDiv);
        }
        if (loading) loading.remove();
        container.classList.remove("hide");
    } catch (err) {
        container.innerHTML = "<p>Error loading projects.</p>";
    }

}

setUpCurrentProjectsPage();
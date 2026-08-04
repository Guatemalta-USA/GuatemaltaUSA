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

// Store fetched raw project data by status
let currentProjects: Project[] = [];
let pastProjects: Project[] = [];

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const role = await getUserRole(user.uid);
        if (role === "admin") {
            const newProjectButton = createButton({
                buttonText: "Start New Project",
                buttonType: "button",
                buttonId: "new-project",
                buttonClass: "accent-button",
                icon: "add",
                i18n: "start_new_project_btn"
            });
            newProjectButton.addEventListener("click", () => navigateTo("/impact/editproject"));
            actionButtons.appendChild(newProjectButton);
        }
    }
    // Refresh current view after determining role to reflect permissions
    const activeTab = document.querySelector('.tab-btn.active')?.id === 'past-tab' ? 'past' : 'current';
    await loadProjects(activeTab);
});

// Initial data fetch
currentProjects = await getProjectsByStatus(true);
pastProjects = await getProjectsByStatus(false);

const currentTabBtn = createButton({
    buttonText: "Current Projects",
    buttonType: "button",
    buttonId: "current-tab",
    buttonClass: "tab-btn active",
    i18n: "current_projects"
});

const pastTabBtn = createButton({
    buttonText: "Past Projects",
    buttonType: "button",
    buttonId: "past-tab",
    buttonClass: "tab-btn",
    i18n: "past_projects"
});

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
    
    // Select correct status array (already filtered for published: true by getProjectsByStatus)
    const projectsToDisplay = status === "current" ? currentProjects : pastProjects;

    try {
        if (projectsToDisplay.length === 0) {
            const noProjects = makeElement("p", null, null, "No projects yet. Check back soon!");
            container.appendChild(noProjects);
        } else {
            const projectsDiv = projectsToDisplay.reduce((acc: HTMLElement, project: Project) => {
                const projectId = project.id ? project.id : "";
                const projectArticle = makeElement("article", projectId, "project-card", null);
                
                const currentLang = (document.documentElement.lang as 'en' | 'es') || 'en';

                // Title Link & Heading
                const projectLink = makeElement("a", null, "post-link", null);
                projectLink.addEventListener("click", () => navigateTo("/impact/project", { params: { id: projectId } }));
                
                // Extract English and Spanish titles safely
                const titleEn = typeof project.projectTitle === "string" 
                    ? project.projectTitle 
                    : (project.projectTitle?.en || "Untitled");
                const titleEs = typeof project.projectTitle === "string" 
                    ? project.projectTitle 
                    : (project.projectTitle?.es || titleEn);

                const initialTitle = currentLang === "es" ? titleEs : titleEn;
                const projectTitle = makeElement("h2", null, "project-title-heading", initialTitle);
                
                // Attach attributes for updateContent() switcher
                projectTitle.setAttribute("data-title-en", titleEn);
                projectTitle.setAttribute("data-title-es", titleEs);
                
                projectLink.appendChild(projectTitle);
                projectArticle.appendChild(projectLink);

                // Paragraph Excerpt
                const excerptEn = project.getFirstParagraph ? project.getFirstParagraph('en') : "";
                const excerptEs = project.getFirstParagraph ? project.getFirstParagraph('es') : excerptEn;
                const initialExcerpt = currentLang === "es" ? excerptEs : excerptEn;

                const firstPElm = makeElement("p", null, null, initialExcerpt);
                
                // Attach attributes for updateContent() switcher
                firstPElm.setAttribute("data-excerpt-en", excerptEn);
                firstPElm.setAttribute("data-excerpt-es", excerptEs);

                projectArticle.appendChild(firstPElm);

                // Read More Link
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
        console.error("Error displaying projects:", err);
        container.innerHTML = "<p>Error loading projects.</p>";
    }
}

await loadProjects("current");
tabs.classList.remove("hide");
updateContent();
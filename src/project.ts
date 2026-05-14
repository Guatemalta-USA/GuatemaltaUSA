import Quill from "quill";
import { getUserRole } from "./firebase/authService";
import { auth } from "./firebase/firebase";
import { getProjectById } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";
import { createButton, storeMessage } from "./modules/utils";

async function setUpProjectView() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
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

        // Initialize Read-Only Quill
        const viewer = new Quill('#viewer-container', {
            theme: 'bubble',
            readOnly: true,
            modules: { toolbar: false }
        });

        viewer.setContents(project.content);

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
    }
}

setUpProjectView();
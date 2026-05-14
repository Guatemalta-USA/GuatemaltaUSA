import { Timestamp } from "firebase/firestore";
import { deleteProject, getProjectById, saveProject } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { Project } from "./models";
import type { TheEditor } from "./modules/editor";
import { navigateTo } from "./modules/navigate";
import { createMessage, storeMessage } from "./modules/utils";

async function setUpEditProjectPage() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const loading = document.getElementById("loading");
    const editorSection = document.getElementById("edit-section") as HTMLElement;

    const pageDisplayTitle = projectId ? "Edit Project" : "New Project";

    await initializeApp('Posts', pageDisplayTitle, {
        type: 'project',
        projectId: projectId || undefined
    });

    const editorInstance = (window as any).quillEditor as TheEditor;

    editorSection.classList.remove("hide");
    const titleInput = document.getElementById('project-title-input') as HTMLInputElement;
    const projectStatusInput = document.getElementById('project-status-toggle') as HTMLInputElement;
    const statusLabel = document.getElementById('status-label') as HTMLElement;
    projectStatusInput.addEventListener("change", () => {
        statusLabel.innerText = projectStatusInput.checked ? "Current Project" : "Past Project";
    });
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    if (projectId && editorInstance) {
        try {
            const project = await getProjectById(projectId);
            if (project) {
                if (titleInput) titleInput.value = project.projectTitle;
                if (projectStatusInput) {
                    projectStatusInput.checked = project.currentProject;
                    statusLabel.innerText = project.currentProject ? "Current Project" : "Past Project";
                }
                editorInstance.quill.setContents(project.content);

            } else {
                storeMessage("The project you tried to edit does not exist", "main-message", "error");
                navigateTo("/impact/currentprojects");
            }
        } catch (err) {
            console.error("Error loading project for editing:", err);
        }
    }

    if (loading) loading.remove();
    if (titleInput.value === "" && deleteBtn) deleteBtn.remove();
    if (projectId && deleteBtn) {
        deleteBtn.style.display = 'inline-block';

        deleteBtn.addEventListener("click", async () => {
            const confirmed = confirm("Are you sure you want to delete this project? This action cannot be undone.");

            if (confirmed) {
                try {
                    deleteBtn.innerText = "Deleting...";
                    (deleteBtn as HTMLButtonElement).disabled = true;

                    if (editorInstance) {
                        await editorInstance.deleteAllImages();
                    }

                    await deleteProject(projectId);

                    storeMessage("Project deleted successfully", "main-message", "delete");
                    navigateTo('/impact/currentprojects');
                } catch (err) {
                    console.error("Delete failed:", err);
                    createMessage("Failed to delete the project. Please try again.", "main-message", "error");
                    deleteBtn.innerText = "Delete Project";
                    (deleteBtn as HTMLButtonElement).disabled = false;
                }
            }
        });
    }

    if (saveBtn && titleInput) {
        saveBtn.addEventListener("click", async () => {
            if (!editorInstance) {
                console.error("Editor instance not found.");
                return;
            }

            try {
                saveBtn.innerText = "Publishing...";
                (saveBtn as HTMLButtonElement).disabled = true;
                const cleanContent = await editorInstance.prepareContentForSave();
                
                if (!titleInput || titleInput.value === "") {
                    createMessage("Please do not leave the Title empty", "main-message", "error");
                    throw Error("Title input can not be empty");
                }

                const projectToSave = new Project(
                    titleInput.value || "Untitled Project",
                    projectStatusInput.checked,
                    Timestamp.now(),
                    cleanContent
                );

                if (projectId) projectToSave.id = projectId;

                const savedId = await saveProject(projectToSave);
                storeMessage("Project published successfully!", "main-message", "check_circle")
                navigateTo("/impact/project", { params: { id: savedId } });
            } catch (err) {
                console.error("Save failed:", err);
                createMessage("Error: Could not save project.", "main-message", "error");
                saveBtn.innerText = "Publish Post";
                (saveBtn as HTMLButtonElement).disabled = false;
            }
        });
    }
}

setUpEditProjectPage().catch(err => {
    console.error("Failed to initialize Edit Project page:", err);
});
import { Timestamp } from "firebase/firestore";
import { deleteProject, getProjectById, saveProject } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import { Project } from "./models";
import type { TheEditor } from "./modules/editor";
import { navigateTo } from "./modules/navigate";
import { confirmDeleteModal, createMessage, storeMessage } from "./modules/utils";
import { getAuthenticatedUser, getUserRole } from "./firebase/authService";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

let goalBarID: string | null = null;

async function setUpEditProjectPage() {
    const loading = document.getElementById("loading");
    
        try {
            const user = await getAuthenticatedUser();
            
            if (!user) {
                storeMessage("Access denied. Admin privileges are required to manage projects.", "main-message", "error");
                navigateTo('/blog');
                return;
            }
            const role = await getUserRole(user.uid);
    
            if (role !== 'admin') {
                storeMessage("Access denied. Admin privileges are required to manage projects.", "main-message", "error");
                navigateTo('/blog');
                return;
            }
        } catch (authError) {
            console.error("Authorization check failed:", authError);
            storeMessage("An error occurred verifying your permissions.", "main-message", "error");
            navigateTo('/blog');
            return;
        }

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
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
    const statusLabel = document.getElementById('current-status-label') as HTMLElement;
    projectStatusInput.addEventListener("change", () => {
        statusLabel.innerText = projectStatusInput.checked ? "Current Project" : "Past Project";
    });
    const publishedCheckbox = document.getElementById("published-toggle") as HTMLInputElement;
    const publishedLabel = document.getElementById("published-label") as HTMLElement;
    publishedLabel.addEventListener("change", () => {
        publishedLabel.innerText = publishedCheckbox.checked ? "Published" : "Unpublished";
    });
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    if (projectId && editorInstance) {
        try {
            const project = await getProjectById(projectId);
            if (project) {
                if (titleInput) titleInput.value = project.projectTitle;
                goalBarID = project["goalBar"];
                if (projectStatusInput) {
                    projectStatusInput.checked = project.currentProject;
                    statusLabel.innerText = project.currentProject ? "Current Project" : "Past Project";
                }
                if (publishedCheckbox) {
                    publishedCheckbox.checked = project.published;
                    publishedLabel.innerText = publishedCheckbox.checked ? "Published" : "Unpublished";
                }
                editorInstance.quill.setContents(project.content);

                if (projectId && deleteBtn) {
                    deleteBtn.style.display = 'inline-block';

                    deleteBtn.addEventListener("click", async () => {
                        const confirmed = await confirmDeleteModal(`Delete "${project.projectTitle}"?`, "Deleting this project will also delete its photos. This action cannot be undone.");

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

    if (saveBtn && titleInput) {
        saveBtn.addEventListener("click", async () => {
            if (!editorInstance) {
                console.error("Editor instance not found.");
                return;
            }

            try {
                saveBtn.innerText = "Saving...";
                (saveBtn as HTMLButtonElement).disabled = true;
                const cleanContent = await editorInstance.prepareContentForSave();

                if (!titleInput || titleInput.value === "") {
                    createMessage("Please do not leave the Title empty", "main-message", "error");
                    throw Error("Can not save project. Title input can not be empty");
                }

                const projectToSave = new Project(
                    titleInput.value,
                    projectStatusInput.checked,
                    publishedCheckbox.checked,
                    Timestamp.now(),
                    cleanContent,
                    goalBarID
                );

                if (projectId) projectToSave.id = projectId;

                const savedId = await saveProject(projectToSave);
                storeMessage("Project published successfully!", "main-message", "check_circle")
                navigateTo("/impact/project", { params: { id: savedId } });
            } catch (err: any) {
                console.error("Save failed:", err);
                createMessage(err, "main-message", "error");
                saveBtn.innerText = "Save Project";
                (saveBtn as HTMLButtonElement).disabled = false;
            }
        });
    }
}

setUpEditProjectPage().catch(err => {
    console.error("Failed to initialize Edit Project page:", err);
});
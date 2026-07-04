import { initializeApp } from './main';
import { TheEditor } from './modules/editor';
import { deletePost, getAllProjects, getPostById, savePost } from './firebase/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { navigateTo } from './modules/navigate';
import { confirmDeleteModal, createMessage, storeMessage } from './modules/utils';
import { Post, Project } from './models';
import { getAuthenticatedUser, getUserRole } from './firebase/authService';

async function setupEditPostPage() {
    const loading = document.getElementById("loading");

    try {
        const user = await getAuthenticatedUser();
        
        if (!user) {
            storeMessage("Access denied. Admin privileges are required to manage posts.", "main-message", "error");
            navigateTo('/blog');
            return;
        }
        const role = await getUserRole(user.uid);

        if (role !== 'admin') {
            storeMessage("Access denied. Admin privileges are required to manage posts.", "main-message", "error");
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
    const postId = params.get('id');
    const editorSection = document.getElementById("edit-section") as HTMLElement;

    const pageDisplayTitle = postId ? "Edit Post" : "New Post";

    await initializeApp('Blog', pageDisplayTitle, {
        type: 'post',
        postId: postId || undefined
    });
    console.log("page loaded")
    const editorInstance = (window as any).quillEditor as TheEditor;

    editorSection.classList.remove("hide");
    const titleInput = document.getElementById('post-title-input') as HTMLInputElement;
    const authorInput = document.getElementById("author-input") as HTMLInputElement;
    const linkToProjectSelect = document.getElementById("link-to-project") as HTMLSelectElement;
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    if (linkToProjectSelect) {
        const none = document.createElement("option");
        none.text = "None";
        none.value = "";
        linkToProjectSelect.add(none);

        try {
            const projects: Project[] = await getAllProjects();
            projects.forEach((project) => {
                const option = document.createElement("option");
                option.text = project.projectTitle;
                if (project.id) option.value = project.id;
                linkToProjectSelect.add(option);
            });
        } catch (err) {
            console.error("Error loading projects:", err);
        }
    }

    let existingPost: Post | null = null;

    if (postId && editorInstance) {
        try {
            existingPost = await getPostById(postId);
            if (existingPost) {
                if (titleInput) titleInput.value = existingPost.postTitle;
                if (authorInput) authorInput.value = existingPost.author;
                editorInstance.quill.setContents(existingPost.content);
                if (linkToProjectSelect && existingPost.linkedProjectId) {
                    linkToProjectSelect.value = existingPost.linkedProjectId;
                }

                console.log("Post loaded into editor successfully");

                if (deleteBtn) {
                    deleteBtn.style.display = 'inline-block';
                    deleteBtn.addEventListener('click', async () => {
                        const confirmed = await confirmDeleteModal(
                            `Delete "${existingPost!.postTitle}"?`, 
                            "Deleting this post will also delete its photos. This action cannot be undone."
                        );

                        if (confirmed) {
                            try {
                                deleteBtn.innerText = "Deleting...";
                                (deleteBtn as HTMLButtonElement).disabled = true;

                                if (editorInstance) {
                                    await editorInstance.deleteAllImages();
                                }

                                await deletePost(postId);

                                storeMessage("Post deleted successfully", "main-message", "delete");
                                navigateTo('/blog');
                            } catch (err) {
                                console.error("Delete failed:", err);
                                createMessage("Failed to delete the post. Please try again.", "main-message", "error");
                                deleteBtn.innerText = "Delete Post";
                                (deleteBtn as HTMLButtonElement).disabled = false;
                            }
                        }
                    });
                }
            } else {
                console.error("No post found with that ID");
                storeMessage("The post you tried to edit does not exist", "main-message", "error");
                navigateTo("/blog");
                return;
            }
        } catch (err) {
            console.error("Error loading post for editing:", err);
        }
    } else {
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
    if (loading) loading.remove();

    if (saveBtn && titleInput) {
        saveBtn.addEventListener('click', async () => {
            if (!editorInstance) {
                console.error("Editor instance not found.");
                return;
            }

            try {
                if (!titleInput.value.trim()) {
                    createMessage("Please do not leave the Title empty", "main-message", "error");
                    throw new Error("Cannot save post. Title input cannot be empty");
                }
                if (!authorInput || !authorInput.value.trim()) {
                    createMessage("Please do not leave the author empty", "main-message", "error");
                    throw new Error("Cannot save post. Author input cannot be empty");
                }

                saveBtn.innerText = "Publishing...";
                (saveBtn as HTMLButtonElement).disabled = true;
                
                const cleanContent = await editorInstance.prepareContentForSave();
                const originalPublishDate = existingPost ? existingPost.publishDate : Timestamp.now();

                const postToSave = new Post(
                    titleInput.value,
                    authorInput.value,
                    originalPublishDate,
                    Timestamp.now(),
                    cleanContent,
                    linkToProjectSelect ? linkToProjectSelect.value : ""
                );

                if (postId) postToSave.id = postId;

                const savedId = await savePost(postToSave);
                storeMessage("Post published successfully!", "main-message", "check_circle");
                navigateTo('/blog/post', { params: { id: savedId } });

            } catch (err: any) {
                console.error("Save failed:", err);
                createMessage(err.message || err, "main-message", "error");
                saveBtn.innerText = "Publish Post";
                (saveBtn as HTMLButtonElement).disabled = false;
            }
        });
    }
}

setupEditPostPage().catch(err => {
    console.error("Failed to initialize Edit Post page:", err);
});
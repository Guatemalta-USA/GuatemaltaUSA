import { initializeApp } from './main';
import { TheEditor } from './modules/editor';
import { deletePost, getAllProjects, getPostById, savePost } from './firebase/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { navigateTo } from './modules/navigate';
import { confirmDeleteModal, createMessage, storeMessage } from './modules/utils';
import { Post, Project } from './models';

async function setupEditPostPage() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    const loading = document.getElementById("loading");
    const editorSection = document.getElementById("edit-section") as HTMLElement;

    const pageDisplayTitle = postId ? "Edit Post" : "New Post";

    await initializeApp('Blog', pageDisplayTitle, {
        type: 'post',
        postId: postId || undefined
    });

    const editorInstance = (window as any).quillEditor as TheEditor;

    editorSection.classList.remove("hide");
    const titleInput = document.getElementById('post-title-input') as HTMLInputElement;
    const authorInput = document.getElementById("author-input") as HTMLInputElement;
    const linkToProjectSelect = document.getElementById("link-to-project") as HTMLSelectElement;
    const saveBtn = document.getElementById('save-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    if (postId && editorInstance) {
        try {
            const post = await getPostById(postId);
            if (post) {
                if (titleInput) titleInput.value = post.postTitle;
                if (authorInput) authorInput.value = post.author;
                editorInstance.quill.setContents(post.content);

                console.log("Post loaded into editor successfully");

                if (postId && deleteBtn) {
                    deleteBtn.style.display = 'inline-block';

                    deleteBtn.addEventListener('click', async () => {
                        const confirmed = await confirmDeleteModal(`Delete "${post.postTitle}"?`, "Deleting this post will also delete its photos. This action cannot be undone.");


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
            }
        } catch (err) {
            console.error("Error loading post for editing:", err);
        }
    }

    const projects: Project[] = await getAllProjects();
    if (linkToProjectSelect) {
        console.log("found select");
    } else {
        console.warn("Can't find select");
    }
    const none = document.createElement("option");
    none.text = "None";
    linkToProjectSelect.add(none);

    projects.forEach((project) => {
        const option = document.createElement("option");
        option.text = project.projectTitle;
        if (project.id) option.value = project.id
        linkToProjectSelect.add(option);
        console.log(`${project.projectTitle} = ${project.id}`)
    });

    if (loading) loading.remove();

    if (titleInput.value === "" && deleteBtn) deleteBtn.remove();



    if (saveBtn && titleInput) {
        saveBtn.addEventListener('click', async () => {

            if (!editorInstance) {
                console.error("Editor instance not found.");
                return;
            }

            try {
                saveBtn.innerText = "Publishing...";
                (saveBtn as HTMLButtonElement).disabled = true;
                const cleanContent = await editorInstance.prepareContentForSave();
                let originalPublishDate = Timestamp.now();
                if (postId) {
                    const originalPost = await getPostById(postId);
                    if (originalPost) {
                        originalPublishDate = originalPost.publishDate;
                    }
                }
                if (!titleInput || titleInput.value === "") {
                    createMessage("Please do not leave the Title empty", "main-message", "error");
                    throw Error("Can not save post. Title input can not be empty");
                }
                if (!authorInput || authorInput.value === "") {
                    createMessage("Please do not leave the author empty", "main-message", "error");
                    throw Error("Can not save post. Author input can not be empty");
                }
                const postToSave = new Post(
                    titleInput.value || "Untitled Post",
                    authorInput.value,
                    originalPublishDate,
                    Timestamp.now(),
                    cleanContent,
                    linkToProjectSelect.value
                );

                if (postId) postToSave.id = postId;

                const savedId = await savePost(postToSave);
                storeMessage("Post published successfully!", "main-message", "check_circle")
                navigateTo('/blog/post', { params: { id: savedId } });

            } catch (err: any) {
                console.error("Save failed:", err);
                createMessage(err, "main-message", "error");
                saveBtn.innerText = "Publish Post";
                (saveBtn as HTMLButtonElement).disabled = false;
            }
        });
    }
}

setupEditPostPage().catch(err => {
    console.error("Failed to initialize Edit Post page:", err);
});
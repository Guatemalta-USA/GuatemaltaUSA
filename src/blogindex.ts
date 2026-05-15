import { initializeApp } from './main';
import { getPostById } from './firebase/firebaseService';
import Quill from 'quill';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import { navigateTo } from './modules/navigate';
import { createButton, storeMessage } from './modules/utils';

// This should run when your blog page loads
function getPostSlug(): string | null {
    const path = window.location.pathname; // "/blog/test-post"
    
    // Split by '/' and remove empty strings from the resulting array
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    // If the path is /blog/test-post, segments will be ["blog", "test-post"]
    if (segments[0] === 'blog' && segments.length > 1) {
        return segments[1];
    }
    
    return null;
}

const slug = getPostSlug();

if (slug) {
    console.log("Fetching post for slug:", slug);
    // Call your Firestore logic here: 
    // const docRef = doc(db, "posts", slug);
}

async function setupPostView() {
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    if (!slug) {
        navigateTo("/blog");
        return;
    }

    await initializeApp('Blog', 'View Post', null);

    const post = await getPostById(slug);
    if (!post) {
        storeMessage("Post not found", "main-message", "error");
        navigateTo("/blog");
    } else {
        const adminActions = document.getElementById('admin-actions');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const role = await getUserRole(user.uid);
                if (role === 'admin' && adminActions) {
                    // Show the admin container
                    adminActions.classList.remove('hide');
                    const editButton = createButton("Edit Post", "button", "edit-post", "accent-button", "edit");

                    // Set up the click listener to go back to the editor
                    editButton.addEventListener('click', () => {
                        // Pass the current post ID to the editor page
                        if (post.id) {
                            navigateTo('/blog/editpost', { params: { id: post.id } });
                        } else {
                            console.error("Cannot edit a post without an ID");
                        }
                    });
                    adminActions.appendChild(editButton);
                }
            }
        });

        // Update UI
        document.title = `${post.postTitle} - Guatemalta USA`;
        const titleElem = document.getElementById('display-title');
        const postInfoElem = document.getElementById("post-info");
        const postContainer = document.getElementById("post-container") as HTMLElement;
        const loading = document.getElementById("loading");
        if (titleElem) titleElem.innerText = post.postTitle;
        if (postInfoElem) postInfoElem.innerText = `By ${post.author} on ${post.publishDate.toDate().toLocaleDateString()}`

        // Initialize Read-Only Quill
        const viewer = new Quill('#viewer-container', {
            theme: 'bubble',
            readOnly: true,
            modules: { toolbar: false }
        });

        viewer.setContents(post.content);

        const lastUpdatedDate = post.lastUpdated.toDate();
        const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdatedDiv.innerText = `Last updated: ${lastUpdatedStr}`;
        
        if (loading) loading.remove();
        postContainer.classList.remove("hide");
    }
}

setupPostView();
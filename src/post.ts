import { initializeApp } from './main';
import { getPostById } from './firebase/firebaseService';
import Quill from 'quill';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import { navigateTo } from './modules/navigate';
import { createButton, storeMessage } from './modules/utils';

function getPostSlug(): string | null {
    const path = window.location.pathname;
    const segments = path.split('/').filter(segment => segment.length > 0);
    
    if (segments[0] === 'blog' && segments.length > 1) {
        const slug = segments[1];
        if (slug === 'post' || slug === 'post.html') return null;
        return slug;
    }
    return null;
}

const slug = getPostSlug();

async function setupPostView() {
    if (!slug) {
        console.warn("No slug found in URL, redirecting to blog list.");
        window.location.href = "/blog";
        return;
    }

    await initializeApp('Blog', 'View Post', null);

    const post = await getPostById(slug);
    
    if (!post) {
        storeMessage("Post not found", "main-message", "error");
        window.location.href = "/blog";
        return;
    }

    // --- Admin & UI Logic ---
    const adminActions = document.getElementById('admin-actions');
    const lastUpdatedDiv = document.getElementById("lastUpdated") as HTMLElement;

    auth.onAuthStateChanged(async (user) => {
        if (user && adminActions) {
            const role = await getUserRole(user.uid);
            if (role === 'admin') {
                adminActions.classList.remove('hide');
                const editButton = createButton("Edit Post", "button", "edit-post", "accent-button", "edit");
                editButton.addEventListener('click', () => {
                    if (post.id) navigateTo('/blog/editpost', { params: { id: post.id } });
                });
                adminActions.appendChild(editButton);
            }
        }
    });

    // Update UI Elements
    document.title = `${post.postTitle} - Guatemalta USA`;
    
    const titleElem = document.getElementById('display-title');
    const postInfoElem = document.getElementById("post-info");
    const postContainer = document.getElementById("post-container");
    const loading = document.getElementById("loading");

    if (titleElem) titleElem.innerText = post.postTitle;
    if (postInfoElem) {
        const dateStr = post.publishDate?.toDate().toLocaleDateString() || "Unknown Date";
        postInfoElem.innerText = `By ${post.author} on ${dateStr}`;
    }

    const viewer = new Quill('#viewer-container', {
        theme: 'bubble',
        readOnly: true,
        modules: { toolbar: false }
    });
    viewer.setContents(post.content);

    if (post.lastUpdated && lastUpdatedDiv) {
        const lastUpdatedStr = post.lastUpdated.toDate().toLocaleString([], {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        lastUpdatedDiv.innerText = `Last updated: ${lastUpdatedStr}`;
    }
    
    if (loading) loading.remove();
    if (postContainer) postContainer.classList.remove("hide");
}

setupPostView();
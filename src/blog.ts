import { initializeApp } from './main';
import { getAllPosts } from './firebase/firebaseService';
import { navigateTo } from './modules/navigate';
import { Post } from './models';
import { createButton, createLink, makeElement } from './modules/utils';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

async function setupBlogPage() {
    await initializeApp('Blog', 'Blog', null);

    const container = document.getElementById('blog-posts-container');
    const loading = document.getElementById("loading");
    const adminActions = document.getElementById("admin-actions") as HTMLElement;

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role === "admin") {
                const newPostButton = createButton("Create New Post", "button", "new-post", "accent-button", "add");
                newPostButton.addEventListener("click", () => navigateTo("/blog/editpost"));
                adminActions.appendChild(newPostButton);
            }
        }
        
    });

    if (!container) return;

    try {
        const posts: Post[] = await getAllPosts(); 
        
        if (posts.length === 0) {
            container.innerHTML = "<p>No posts yet. Check back soon!</p>";
            return;
        }

        const postsDiv = posts.reduce((acc: HTMLElement, post: Post) => {
            const postId = post.id ? post.id : "";
            const postArticle = makeElement("article", postId, "", null);
            const postLink = makeElement("a", null, "post-link", null);
            postLink.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));
            const postTitle = makeElement("h2", null, null, post.postTitle);
            postLink.appendChild(postTitle);
            postArticle.appendChild(postLink);
            const postInfo = makeElement("h3", null, null, `By ${post.author} on ${post.publishDate.toDate().toLocaleDateString()}`);
            postArticle.appendChild(postInfo);
            const firstP = post.getFirstParagraph();
            const firstPElm = makeElement("p", null, null, firstP);
            postArticle.appendChild(firstPElm);
            const readMore = createLink("Read More...", "", false);
            readMore.classList.add("post-link");
            readMore.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));
            postArticle.appendChild(readMore);
            acc.appendChild(postArticle);
            return acc;
        }, document.createElement("div"));
        container.appendChild(postsDiv);
        if (loading) loading.remove();
        container.classList.remove("hide");

    } catch (err) {
        container.innerHTML = "<p>Error loading posts.</p>";
    }
}

setupBlogPage();
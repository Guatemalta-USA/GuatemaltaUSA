import { initializeApp } from './main';
import { getAllPosts } from './firebase/firebaseService';
import { navigateTo } from './modules/navigate';
import { Post } from './models';
import { createButton, createLink, formatDate, makeElement } from './modules/utils';
import { auth } from './firebase/firebase';
import { getUserRole } from './firebase/authService';
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import i18n, { updateContent } from './modules/i18n';

await initializeApp('Blog', 'Blog', null);

const container = document.getElementById('blog-posts-container') as HTMLElement;
const loading = document.getElementById("loading");
const adminActions = document.getElementById("admin-actions") as HTMLElement;

let posts: Post[] = [];

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const role = await getUserRole(user.uid);
        if (role === "admin") {
            const newPostButton = createButton({ buttonText: "Create New Post", buttonType: "button", buttonId: "new-post", buttonClass: "accent-button", icon: "add" });
            newPostButton.addEventListener("click", () => navigateTo("/blog/editpost"));
            adminActions.appendChild(newPostButton);
        }
    }

    await loadPosts();
});

posts = await getAllPosts();

function getExcerpt(post: Post, lang: 'en' | 'es'): string {
    if (typeof post.getFirstParagraph === "function") {
        const result = post.getFirstParagraph(lang);
        if (result) return result;
    }
    return "";
}

async function loadPosts() {
    container.innerHTML = "";
    const currentLang = (document.documentElement.lang as 'en' | 'es') || 'en';

    try {
        if (posts.length === 0) {
            const noPosts = makeElement("p", null, null, "No posts yet. Check back soon!");
            container.appendChild(noPosts);
        } else {
            const postsDiv = posts.reduce((acc: HTMLElement, post: Post) => {
                const postId = post.id ? post.id : "";
                const postArticle = makeElement("article", postId, "", null);
                const postLink = makeElement("a", null, "post-link", null);
                postLink.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));

                const titleEn = post.getTitle ? post.getTitle('en') : ((post.postTitle as any)?.en || "untitled");
                const titleEs = post.getTitle ? (post.getTitle('es') || titleEn) : ((post.postTitle as any)?.es || titleEn);
                const initialTitle = post.getTitle ? post.getTitle(currentLang) : (currentLang === 'es' ? titleEs : titleEn);
                const postTitle = makeElement("h2", null, null, initialTitle);
                postTitle.setAttribute("data-title-en", titleEn);
                postTitle.setAttribute("data-title-es", titleEs);
                postLink.appendChild(postTitle);
                postArticle.appendChild(postLink);

                const postInfo = makeElement("h3", null, null, i18n.t('post_by_date', { author: post["author"], date: formatDate(post.publishDate) }));
                postArticle.appendChild(postInfo);

                const excerptEn = getExcerpt(post, 'en');
                const excerptEs = getExcerpt(post, 'es') || excerptEn;
                const initialExcerpt = currentLang === 'es' ? excerptEs : excerptEn;
                const firstPElm = makeElement("p", null, null, initialExcerpt);
                firstPElm.setAttribute("data-excerpt-en", excerptEn);
                firstPElm.setAttribute("data-excerpt-es", excerptEs);
                postArticle.append(firstPElm);

                
                const readMore = createLink("Read More...", "", false);
                readMore.setAttribute("data-i18n", "read_more");
                readMore.classList.add("post-link");
                readMore.addEventListener("click", () => navigateTo('/blog/post', { params: { id: postId } }));
                postArticle.appendChild(readMore);
                acc.appendChild(postArticle);
                return acc;
            }, document.createElement("div"));
            container.appendChild(postsDiv);
            updateContent();
        }
    } catch (err) {
        container.innerHTML = "<p>Error loading posts.</p>";
    }
}
await loadPosts();
updateContent();
if (loading) loading.remove();
container.classList.remove("hide");
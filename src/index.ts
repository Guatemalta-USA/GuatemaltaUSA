import { getAllPosts, getProjectsByStatus } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Post, Project } from "./models.js";
import { displayGallery, getPhotosFromGithub, setupControls } from "./modules/imageGallery.js";
import { navigateTo } from "./modules/navigate.js";
import { createLink, makeElement } from "./modules/utils.js";
import i18n, { updateContent, getResolvedLanguage } from "./modules/i18n.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

const loadingProjects = document.querySelector('.loading-projects') as HTMLElement;
const loadingUpdates = document.querySelector('.loading-updates') as HTMLElement;
const photosSection = document.getElementById("home-photos") as HTMLElement;
const currentProjectsSection = document.getElementById("home-current") as HTMLElement;
const updatesSection = document.getElementById("home-updates") as HTMLElement;

async function loadPhotos() {
  const placeholderGallery = document.getElementById("placeholder-container") as HTMLElement;
  try {
    const imagesPaths = await getPhotosFromGithub(
      "https://raw.githubusercontent.com/Guatemalta-USA/photos/refs/heads/main/homepage/"
    );
    const photos = displayGallery(imagesPaths);
    photosSection.appendChild(photos);
    setupControls();
  } catch (err) {
    console.error("Error loading gallery photos:", err);
  } finally {
    if (placeholderGallery) {
      placeholderGallery.remove();
    }
  }
}

let cachedProjects: Project[] = [];

async function loadProjects() {
  const projectsHeading = makeElement("h1", null, null, "Current Projects", "current_projects");

  try {
    if (cachedProjects.length === 0) {
      cachedProjects = await getProjectsByStatus(true);
    }

    if (loadingProjects) {
      loadingProjects.remove();
    }

    currentProjectsSection.innerHTML = "";

    if (cachedProjects.length === 0) {
      const emptyMsg = makeElement("p", null, null, "No projects yet. Check back soon!", "no_projects_yet");
      currentProjectsSection.appendChild(emptyMsg);
    } else {
      const fragment = document.createDocumentFragment();
      const currentLang = (getResolvedLanguage() || 'en').slice(0, 2) as 'en' | 'es';

      cachedProjects.forEach((project: Project) => {
        const projectId = project.id ? project.id : "";
        const projectArticle = makeElement("article", projectId, null, null);
        const projectLink = makeElement("a", null, "post-link", null);

        projectLink.addEventListener("click", () =>
          navigateTo("/impact/project", { params: { id: projectId } })
        );

        const displayTitle = project.projectTitle[currentLang] || project.projectTitle.en || project.projectTitle.es || "";
        const projectTitle = makeElement("h2", null, null, displayTitle);
        
        projectLink.appendChild(projectTitle);
        projectArticle.appendChild(projectLink);

        const firstP = project.getFirstParagraph(currentLang);
        const firstPElm = makeElement("p", null, null, firstP);
        projectArticle.appendChild(firstPElm);

        const readMore = createLink("Read More...", "", false);
        readMore.setAttribute("data-i18n", "read_more");
        readMore.classList.add("post-link");
        readMore.addEventListener("click", () =>
          navigateTo("/impact/project", { params: { id: projectId } })
        );
        projectArticle.appendChild(readMore);

        fragment.appendChild(projectArticle);
      });

      currentProjectsSection.appendChild(fragment);
    }
  } catch (err) {
    console.error("Error loading projects:", err);
    currentProjectsSection.innerHTML = "";
    currentProjectsSection.appendChild(
      makeElement("p", null, null, "Error loading projects.", "error_loading_projects")
    );
  }

  currentProjectsSection.prepend(projectsHeading);
  updateContent();
}

i18n.on('languageChanged', () => {
  if (cachedProjects.length > 0) {
    loadProjects();
  }
});

async function loadPosts() {
  const updatesHeading = makeElement("h1", null, null, "Recent Blog Posts", "recent_blog_posts");

  try {
    const posts: Post[] = await getAllPosts();

    if (loadingUpdates) {
      loadingUpdates.remove();
    }

    if (posts.length === 0) {
      const emptyMsg = makeElement("p", null, null, "No posts yet. Check back soon!", "no_posts_yet");
      updatesSection.appendChild(emptyMsg);
    } else {
      const fragment = document.createDocumentFragment();

      posts.slice(0, 3).forEach((post: Post) => {
        const postId = post.id ? post.id : "";
        const postArticle = makeElement("article", postId, "", null);
        const postLink = makeElement("a", null, "post-link", null);

        postLink.addEventListener("click", () =>
          navigateTo('/blog/post', { params: { id: postId } })
        );

        const postTitle = makeElement("h2", null, null, post.postTitle);
        postLink.appendChild(postTitle);
        postArticle.appendChild(postLink);
        const postInfo = makeElement("h3", null, null, i18n.t('post_by_date', { author: post["author"], date: post.publishDate.toDate().toLocaleDateString() }));

        postInfo.setAttribute("data-i18n-options", JSON.stringify({
          author: post.author,
          date: post.publishDate.toDate().toLocaleDateString()
        }));
        postArticle.appendChild(postInfo);

        const firstP = post.getFirstParagraph();
        const firstPElm = makeElement("p", null, null, firstP);
        postArticle.appendChild(firstPElm);

        const readMore = createLink("Read More...", "", false);
        readMore.setAttribute("data-i18n", "read_more");
        readMore.classList.add("post-link");
        readMore.addEventListener("click", () =>
          navigateTo('/blog/post', { params: { id: postId } })
        );
        postArticle.appendChild(readMore);

        fragment.appendChild(postArticle);
      });

      updatesSection.appendChild(fragment);
      updateContent();
    }
  } catch (err) {
    console.error("Error loading posts:", err);
    updatesSection.appendChild(
      makeElement("p", null, null, "Error loading posts.", "error_loading_posts")
    );
  }

  updatesSection.prepend(updatesHeading);
}

initializeApp("Home", "Home").then(async () => {
  document.title = "Guatemalta USA | Sustainable Housing & Education Nonprofit";
  loadPhotos();

  // Load dynamic content, then run updateContent() to ensure everything renders translated on first load
  await Promise.all([loadProjects(), loadPosts()]);
  updateContent();
});
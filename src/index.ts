import { getAllPosts, getProjectsByStatus } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Post, Project } from "./models.js";
import { displayGallery, getPhotosFromGithub, setupControls } from "./modules/imageGallery.js";
import { navigateTo } from "./modules/navigate.js";
import { createLink, makeElement } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

const loadingProjects = document.querySelector('.loading-projects') as HTMLElement;
const loadingUpdates = document.querySelector('.loading-updates') as HTMLElement;
const photosSection = document.getElementById("home-photos") as HTMLElement;
const currentProjectsSection = document.getElementById("home-current") as HTMLElement;
const updatesSection = document.getElementById("home-updates") as HTMLElement;

initializeApp("Home", "Home").then(async () => {
  document.title = "Guatemalta USA | Sustainable Housing & Education Nonprofit";

  const [photosResult, projectsResult, postsResult] = await Promise.allSettled([
    getPhotosFromGithub("https://raw.githubusercontent.com/Guatemalta-USA/photos/refs/heads/main/homepage/"),
    getProjectsByStatus(true),
    getAllPosts(),
  ]);

  const placeholderGallery = document.getElementById("placeholder-container") as HTMLElement;
  if (photosResult.status === "fulfilled") {
    const photos = displayGallery(photosResult.value);
    photosSection.appendChild(photos);
    setupControls();
  } else {
    console.error("Error loading gallery photos:", photosResult.reason);
  }
  if (placeholderGallery) {
    placeholderGallery.remove();
  }

  const projectsHeading = makeElement("h1", null, null, "Current Projects");
  if (projectsResult.status === "fulfilled") {
    const currentProjects: Project[] = projectsResult.value;

    if (loadingProjects) loadingProjects.remove();

    if (currentProjects.length === 0) {
      currentProjectsSection.innerHTML = "<p>No projects yet. Check back soon!</p>";
    } else {
      const fragment = document.createDocumentFragment();

      currentProjects.forEach((project: Project) => {
        const projectId = project.id ? project.id : "";
        const projectArticle = makeElement("article", projectId, null, null);
        const projectLink = makeElement("a", null, "post-link", null);

        projectLink.addEventListener("click", () =>
          navigateTo("/impact/project", { params: { id: projectId } })
        );

        const projectTitle = makeElement("h2", null, null, project.projectTitle);
        projectLink.appendChild(projectTitle);
        projectArticle.appendChild(projectLink);

        const firstP = project.getFirstParagraph();
        const firstPElm = makeElement("p", null, null, firstP);
        projectArticle.appendChild(firstPElm);

        const readMore = createLink("Read More...", "", false);
        readMore.classList.add("post-link");
        readMore.addEventListener("click", () =>
          navigateTo("/impact/project", { params: { id: projectId } })
        );
        projectArticle.appendChild(readMore);

        fragment.appendChild(projectArticle);
      });

      currentProjectsSection.appendChild(fragment);
    }
  } else {
    console.error("Error loading projects:", projectsResult.reason);
    currentProjectsSection.innerHTML = "<p>Error loading projects.</p>";
  }
  currentProjectsSection.prepend(projectsHeading);
  const updatesHeading = makeElement("h1", null, null, "Recent Blog Posts");
  if (postsResult.status === "fulfilled") {
    const posts: Post[] = postsResult.value;

    if (loadingUpdates) loadingUpdates.remove();

    if (posts.length === 0) {
      updatesSection.innerHTML = "<p>No posts yet. Check back soon!</p>";
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

        const postInfo = makeElement(
          "h3",
          null,
          null,
          `By ${post.author} on ${post.publishDate.toDate().toLocaleDateString()}`
        );
        postArticle.appendChild(postInfo);

        const firstP = post.getFirstParagraph();
        const firstPElm = makeElement("p", null, null, firstP);
        postArticle.appendChild(firstPElm);

        const readMore = createLink("Read More...", "", false);
        readMore.classList.add("post-link");
        readMore.addEventListener("click", () =>
          navigateTo('/blog/post', { params: { id: postId } })
        );
        postArticle.appendChild(readMore);

        fragment.appendChild(postArticle);
      });

      updatesSection.appendChild(fragment);
    }
  } else {
    console.error("Error loading posts:", postsResult.reason);
    updatesSection.innerHTML = "<p>Error loading posts.</p>";
  }
  updatesSection.prepend(updatesHeading);
});
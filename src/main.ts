import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { clearMessages, createButton, createMessage } from "./modules/utils.js";
import { Post, Project } from "./models.js";
import { TheEditor } from "./modules/editor.js";
import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { Timestamp } from 'firebase/firestore';
import { getPageCampaignId, getPostById, getProjectById, savePost, saveProject } from "./firebase/firebaseService.js";
import { initGivebutter } from "./services/givebutter.service.js";

const viewSection = document.getElementById('content-display');
const editSection = document.getElementById('edit-section');
const adminControls = document.getElementById('admin-controls');
const cancelButton = document.getElementById('cancel-btn');

let goalBarID: string | null = null;

initGivebutter()

function toggleMode(editor: TheEditor, isEditing: boolean) {
  if (viewSection && adminControls && editSection) {
    if (isEditing) {
      clearMessages();
      viewSection.classList.add("hide");
      adminControls.classList.add("hide");
      editSection.classList.remove("hide");
    } else {
      viewSection.classList.remove("hide");
      adminControls.classList.remove("hide");
      editSection.classList.add("hide");
      viewSection.innerHTML = editor.getHTML();
    }
  }
}

function showAdminUI(editor: TheEditor) {
  const editButton = createButton("Edit Page Content", "button", "edit-btn", "accent-button", "edit");
  editButton.addEventListener('click', async () => {
    toggleMode(editor, true);
  });
  if (adminControls) {
    adminControls.appendChild(editButton);
    adminControls.classList.remove("hide");
  }
}

type EditorMode =
  | { type: 'page'; pageName: string }
  | { type: 'post'; postId?: string }
  | { type: 'project'; projectId?: string }
  | null;

export async function initializeApp(
  parentPage: string,
  currentPage: string,
  editorConfig: EditorMode = null
) {
  // Set page title
  if (currentPage !== "") {
    document.title = `${currentPage} - Guatemalta USA`;
  }

  // Load DOM
  await new Promise<void>(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    } else {
      resolve();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  let newId: string | null = null;
  if (id) {
    newId = await getPageCampaignId(id);
  } else {
    newId = await getPageCampaignId(currentPage);
  }
  if (newId) {
    loadNav(parentPage, newId);
  } else {
    loadNav(parentPage);
  }

  loadHeader();
  loadFooter();
  let mobileNavToggle = document.getElementById("mobile-nav-toggle") as HTMLElement;
  const nav = document.querySelector("nav") as HTMLElement;
  mobileNavToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    const isOpen = nav.classList.contains("open");
    mobileNavToggle.innerText = isOpen ? "close" : "menu";
    mobileNavToggle.style.color = isOpen ? "#fff" : "var(--main-color)";
  });

  const storedMessageString = sessionStorage.getItem("message");
  if (storedMessageString) {
    const storedMessage = JSON.parse(storedMessageString);
    createMessage(storedMessage['message'], storedMessage['messageContainer'], storedMessage['icon']);
    sessionStorage.removeItem("message");
  }

  // Editor Logic
  if (editorConfig) {
    const editor = new TheEditor();
    (window as any).quillEditor = editor;
    const titleInput = document.getElementById('post-title-input') as HTMLInputElement;
    const authorInput = document.getElementById('author-input') as HTMLInputElement;
    const projectTitleInput = document.getElementById('project-title-input') as HTMLInputElement;
    const projectStatusInput = document.getElementById('project-status-toggle') as HTMLInputElement;
    const publishedInput = document.getElementById("published-toggle") as HTMLInputElement;
    if (viewSection && cancelButton) {

      // Load Initial Data
      if (editorConfig.type === 'page') {
        await editor.load(editorConfig.pageName);
      } else if (editorConfig.type === 'post' && editorConfig.postId) {
        const post = await getPostById(editorConfig.postId);
        if (post) {
          if (titleInput) titleInput.value = post.postTitle;
          editor.quill.setContents(post.content);
        }
      } else if (editorConfig.type === 'project' && editorConfig.projectId) {
        const project = await getProjectById(editorConfig.projectId);
        if (project) goalBarID = project.goalBar;
        if (project) {
          if (projectTitleInput) projectTitleInput.value = project.projectTitle;
          editor.quill.setContents(project.content);
        }
      }

      viewSection.innerHTML = editor.getHTML();

      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userRole = await getUserRole(user.uid);
          if (userRole === "admin") {
            showAdminUI(editor);

            document.getElementById('save-btn')?.addEventListener('click', async () => {
              try {
                if (editorConfig.type === 'page') {
                  // Save standard page
                  await editor.save();
                } else if (editorConfig.type === 'post') {
                  // Save Post
                  const content = await editor.prepareContentForSave();
                  const postTitle = titleInput?.value || "Untitled Post";
                  const existingPost = editorConfig.postId
                    ? await getPostById(editorConfig.postId)
                    : null;
                  const linkToProjectSelect = document.getElementById("link-to-project") as HTMLSelectElement;
                  const postToSave = new Post(
                    postTitle,
                    authorInput.value,
                    existingPost ? existingPost.publishDate : Timestamp.now(),
                    Timestamp.now(),
                    content,
                    linkToProjectSelect.value
                  );

                  if (editorConfig.postId) postToSave.id = editorConfig.postId;

                  await savePost(postToSave);
                } else if (editorConfig.type === 'project') {
                  // Save Project
                  const content = await editor.prepareContentForSave();
                  const projectTitle = projectTitleInput?.value || "Untitled Project";

                  const projectToSave = new Project(
                    projectTitle,
                    projectStatusInput.checked,
                    publishedInput.checked,
                    Timestamp.now(),
                    content,
                    goalBarID
                  );

                  if (editorConfig.projectId) projectToSave.id = editorConfig.projectId;
                  await saveProject(projectToSave);
                }

                toggleMode(editor, false);
                createMessage("Saved successfully!", "main-message", "check_circle");
              } catch (err) {
                console.error("Save failed", err);
                createMessage("Save failed.", "main-message", "error");
              }
            });
          }
        }
      });

      cancelButton.addEventListener('click', async () => {
        try {
          cancelButton.innerText = "Reverting...";
          if (editorConfig.type === 'page') {
            await editor.load(editorConfig.pageName);
          } else if (editorConfig.type === 'post' && editorConfig.postId) {
            const post = await getPostById(editorConfig.postId);
            if (post) editor.quill.setContents(post.content);
          } else if (editorConfig.type === 'project' && editorConfig.projectId) {
            const project = await getProjectById(editorConfig.projectId);
            if (project) editor.quill.setContents(project.content);
          }
          toggleMode(editor, false);
        } catch (error) {
          console.error("Revert failed", error);
        } finally {
          cancelButton.innerText = "Cancel";
        }
      });
    }
  }
}
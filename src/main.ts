import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { clearMessages, createButton, createMessage } from "./modules/utils.js";
import { Post, Project } from "./models.js";
import { TheEditor } from "./modules/editor.js";
import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { Timestamp } from 'firebase/firestore';
import { getPostById, getProjectById, savePost, saveProject } from "./firebase/firebaseService.js";
import { initGivebutter } from "./services/givebutter.service.js";

const viewSection = document.getElementById('content-display');
const editSection = document.getElementById('edit-section');
const adminControls = document.getElementById('admin-controls');
const cancelButton = document.getElementById('cancel-btn');

let goalBarID: string | null = null;
let currentProject: Project | null = null;

initGivebutter();

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
  if (!adminControls || adminControls.querySelector("#edit-btn")) return;

  const editButton = createButton({ buttonText: "Edit Page Content", buttonType: "button", buttonId: "edit-btn", buttonClass: "accent-button", icon: "edit", i18n: "edit_page" });
  editButton.addEventListener('click', () => toggleMode(editor, true));

  adminControls.appendChild(editButton);
  adminControls.classList.remove("hide");
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
  if (currentPage !== "") {
    document.title = `${currentPage} - Guatemalta USA`;
  }

  loadNav(parentPage);
  loadHeader();
  loadFooter();

  const mobileNavToggle = document.getElementById("mobile-nav-toggle") as HTMLElement;
  const nav = document.querySelector("nav") as HTMLElement;
  if (mobileNavToggle && nav) {
    mobileNavToggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      const isOpen = nav.classList.contains("open");
      mobileNavToggle.innerText = isOpen ? "close" : "menu";
      mobileNavToggle.style.color = isOpen ? "#fff" : "var(--main-color)";
    });
  }

  const storedMessageString = sessionStorage.getItem("message");
  if (storedMessageString) {
    const storedMessage = JSON.parse(storedMessageString);
    createMessage(storedMessage['message'], storedMessage['messageContainer'], storedMessage['icon']);
    sessionStorage.removeItem("message");
  }

  if (editorConfig && viewSection && cancelButton) {
    const editor = new TheEditor();
    (window as any).quillEditor = editor;

    const titleInput = document.getElementById('post-title-input') as HTMLInputElement;
    const authorInput = document.getElementById('author-input') as HTMLInputElement;
    const projectTitleInput = document.getElementById('project-title-input') as HTMLInputElement;
    const projectStatusInput = document.getElementById('project-status-toggle') as HTMLInputElement;
    const publishedInput = document.getElementById("published-toggle") as HTMLInputElement;

    let loadedPostPublishDate: Timestamp | null = null;

    if (editorConfig.type === 'page') {
      await editor.load(editorConfig.pageName);
    } else if (editorConfig.type === 'post' && editorConfig.postId) {
      const post = await getPostById(editorConfig.postId);
      if (post) {
        if (titleInput) titleInput.value = post.postTitle;
        loadedPostPublishDate = post.publishDate;
        editor.quill.setContents(post.content);
      }
    } else if (editorConfig.type === 'project' && editorConfig.projectId) {
      currentProject = await getProjectById(editorConfig.projectId);
      if (currentProject) {
        goalBarID = currentProject.goalBar;
        if (projectTitleInput) {
          projectTitleInput.value = currentProject.getTitle('en');
        }
        const primaryContent = currentProject.content.en || currentProject.content.es;
        if (primaryContent) {
          if (typeof primaryContent === 'string') {
            editor.setHTML(primaryContent);
          } else {
            editor.quill.setContents(primaryContent);
          }
        }
      }
    }

    viewSection.innerHTML = editor.getHTML();

    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRole = await getUserRole(currentUser.uid);
      if (userRole === "admin") {
        showAdminUI(editor);
      }
    }

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      const newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);

      newSaveBtn.addEventListener('click', async () => {
        try {
          if (editorConfig.type === 'page') {
            await editor.save();
          } else if (editorConfig.type === 'post') {
            const content = await editor.prepareContentForSave();
            const postTitle = titleInput?.value || "Untitled Post";
            const linkToProjectSelect = document.getElementById("link-to-project") as HTMLSelectElement;

            const postToSave = new Post(
              postTitle,
              authorInput?.value || "",
              loadedPostPublishDate || Timestamp.now(),
              Timestamp.now(),
              content,
              linkToProjectSelect?.value || ""
            );

            if (editorConfig.postId) postToSave.id = editorConfig.postId;
            await savePost(postToSave);
          } else if (editorConfig.type === 'project') {
            const content = await editor.prepareContentForSave();
            const titleValue = projectTitleInput?.value || "Untitled Project";

            // Maintain existing Spanish translation if available on fetched instance
            const updatedTitle = {
              en: titleValue,
              es: currentProject?.projectTitle?.es || ""
            };

            const updatedContent = {
              en: content,
              es: currentProject?.content?.es || ""
            };

            const projectToSave = new Project(
              updatedTitle,
              updatedContent,
              projectStatusInput?.checked ?? true,
              publishedInput?.checked ?? true,
              goalBarID,
              editorConfig.projectId
            );

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
          if (project) {
            const primaryContent = project.content.en || project.content.es;
            if (typeof primaryContent === 'string') {
              editor.setHTML(primaryContent);
            } else if (primaryContent) {
              editor.quill.setContents(primaryContent);
            }
          }
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
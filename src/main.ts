import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { clearMessages, createButton, createMessage } from "./modules/utils.js";
import { Post, Project, type MessageParams } from "./models.js";
import { TheEditor } from "./modules/editor.js";
import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { Timestamp } from 'firebase/firestore';
import { getPostById, getProjectById, savePost, saveProject } from "./firebase/firebaseService.js";
import { initGivebutter } from "./services/givebutter.service.js";
import i18n, { getResolvedLanguage } from "./modules/i18n.js";

const viewSection = document.getElementById('content-display');
const editSection = document.getElementById('edit-section');
const adminControls = document.getElementById('admin-controls');
const cancelButton = document.getElementById('cancel-btn');

let goalBarID: string | null = null;
let currentProject: Project | null = null;
let currentPost: Post | null = null;

initGivebutter();

function isContentValid(content: any): boolean {
  if (!content) return false;
  if (typeof content === 'string') {
    return content.replace(/<[^>]*>/g, '').trim().length > 0;
  }
  if (Array.isArray(content)) {
    return content.length > 0;
  }
  if (content.ops && Array.isArray(content.ops)) {
    if (content.ops.length === 0) return false;
    return content.ops.some((op: any) => {
      if (typeof op.insert === 'string') {
        return op.insert.replace(/\n/g, '').trim().length > 0;
      }
      return op.insert !== undefined && op.insert !== null;
    });
  }
  return true;
}

function resolveLocalizedContent(contentObj: any, currentLang: string): any {
  if (!contentObj) return null;
  const rawEn = contentObj.en || contentObj;
  const rawEs = contentObj.es || null;

  if (currentLang === 'es' && isContentValid(rawEs)) {
    return rawEs;
  }
  return rawEn;
}

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
    const storedMessage: MessageParams = JSON.parse(storedMessageString);
    createMessage(storedMessage);
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
        currentPost = post;
        if (titleInput) titleInput.value = post.getTitle('en');
        loadedPostPublishDate = post.publishDate as Timestamp;
        
        const currentLang = (getResolvedLanguage() || 'en').slice(0, 2);
        const activeContent = resolveLocalizedContent(post.content, currentLang);

        if (typeof activeContent === 'string') {
          editor.setHTML(activeContent);
        } else if (activeContent) {
          editor.quill.setContents(activeContent as any);
        }
      }
    } else if (editorConfig.type === 'project' && editorConfig.projectId) {
      currentProject = await getProjectById(editorConfig.projectId);
      if (currentProject) {
        goalBarID = currentProject.goalBar;
        if (projectTitleInput) {
          projectTitleInput.value = currentProject.getTitle('en');
        }

        const currentLang = (getResolvedLanguage() || 'en').slice(0, 2);
        const activeContent = resolveLocalizedContent(currentProject.content, currentLang);

        if (typeof activeContent === 'string') {
          editor.setHTML(activeContent);
        } else if (activeContent) {
          editor.quill.setContents(activeContent as any);
        }
      }
    }

    viewSection.innerHTML = editor.getHTML();

    // Listen for global language changes and re-sync editor content & DOM
    i18n.on('languageChanged', (lng: string) => {
      const targetLang = lng.startsWith('es') ? 'es' : 'en';
      editor.setLanguage(targetLang);
      if (viewSection && editSection?.classList.contains('hide')) {
        viewSection.innerHTML = editor.getHTML();
      }
    });

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
            const localizedContent = await editor.prepareContentForSave();
            const titleValue = titleInput?.value || "Untitled Post";
            
            const updatedPostTitle = {
              en: titleValue,
              es: currentPost?.postTitle?.es || titleValue
            };

            const linkToProjectSelect = document.getElementById("link-to-project") as HTMLSelectElement;

            const postToSave = new Post(
              updatedPostTitle,
              authorInput?.value || "",
              loadedPostPublishDate || Timestamp.now(),
              Timestamp.now(),
              localizedContent,
              linkToProjectSelect?.value || ""
            );

            if (editorConfig.postId) postToSave.id = editorConfig.postId;
            await savePost(postToSave);
          } else if (editorConfig.type === 'project') {
            const localizedContent = await editor.prepareContentForSave();
            const titleValue = projectTitleInput?.value || "Untitled Project";

            const updatedTitle = {
              en: titleValue,
              es: currentProject?.projectTitle?.es || titleValue
            };

            const projectToSave = new Project(
              updatedTitle,
              localizedContent,
              projectStatusInput?.checked ?? true,
              publishedInput?.checked ?? true,
              goalBarID,
              0,
              editorConfig.projectId
            );

            await saveProject(projectToSave);
          }

          toggleMode(editor, false);
          createMessage({messageBody: "Saved successfully!", location: "main-message", type: "check_circle"});
        } catch (err) {
          console.error("Save failed", err);
          createMessage({messageBody: "Save failed.", location: "main-message", type: "error"});
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
          if (post) {
            const currentLang = (getResolvedLanguage() || 'en').slice(0, 2);
            const primaryPostContent = resolveLocalizedContent(post.content, currentLang);
            if (typeof primaryPostContent === "string") {
              editor.setHTML(primaryPostContent);
            } else if (primaryPostContent) {
              editor.quill.setContents(primaryPostContent as any);
            }
          }
        } else if (editorConfig.type === 'project' && editorConfig.projectId) {
          const project = await getProjectById(editorConfig.projectId);
          if (project) {
            const currentLang = (getResolvedLanguage() || 'en').slice(0, 2);
            const primaryContent = resolveLocalizedContent(project.content, currentLang);
            if (typeof primaryContent === 'string') {
              editor.setHTML(primaryContent);
            } else if (primaryContent) {
              editor.quill.setContents(primaryContent as any);
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
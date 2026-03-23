import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { clearMessages, createButton, createMessage } from "./modules/utils.js";
import { Message } from "./models.js";
import { TheEditor } from "./modules/editor.js";
import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";

let mobileNavToggle = document.getElementById("mobile-nav-toggle") as HTMLElement;
let nav: HTMLElement;

const viewSection = document.getElementById('content-display');
const editSection = document.getElementById('edit-section');
const adminControls = document.getElementById('admin-controls');
const cancelButton = document.getElementById('cancel-btn');

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
  const editButton = createButton("Edit Page Content", "button", "edit-btn", "accent-button");
  editButton.addEventListener('click', async () => {
    toggleMode(editor, true);
  });
  if (adminControls) {
    adminControls.appendChild(editButton);
    adminControls.classList.remove("hide");
  }
}

function showLightbox(url: string) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    const img = document.createElement('img');
    img.src = url;
    img.className = 'lightbox-image';
    const hint = document.createElement('span');
    hint.textContent = 'Click anywhere to close';
    hint.className = 'lightbox-hint';

    overlay.append(img, hint);
    document.body.appendChild(overlay);
    overlay.onclick = () => {
        overlay.classList.add('fadeOut');
        setTimeout(() => overlay.remove(), 200);
    };
}

export async function initializeApp(partentPage: string, currentPage: string, includeEditor: boolean) {
  console.log(partentPage);
  if (currentPage !== "") {
    //Set the page title
    document.title = `${currentPage} - Guatemalta USA`;
  }
  //Wait for the DOM to load
  await new Promise<void>(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    } else {
      resolve();
    }
  });
  loadHeader();
  loadNav();
  loadFooter();
  nav = document.querySelector("nav") as HTMLElement;
  mobileNavToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
    const isOpen = nav.classList.contains("open");
    if (isOpen) {
      mobileNavToggle.innerText = "close";
      mobileNavToggle.style.color = "#fff";
    } else {
      mobileNavToggle.innerText = "menu";
      mobileNavToggle.style.color = "var(--main-color)";
    }
  });

  // Check if there are any stored messages to display
  const storedMessageString = sessionStorage.getItem("message");
  if (storedMessageString) {
    const storedMessage: Message = JSON.parse(storedMessageString);
    createMessage(storedMessage['message'], storedMessage['messageContainer'], storedMessage['icon']);
    sessionStorage.removeItem("message");
  }

  if (includeEditor) {
    const editor = new TheEditor();
    if (viewSection && cancelButton) {
      await editor.load(currentPage);
      viewSection.innerHTML = editor.getHTML();
      viewSection.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
          const imgSrc = (target as HTMLImageElement).src;
          showLightbox(imgSrc);
        }
      });

      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userRole = await getUserRole(user.uid);
          if (userRole === "admin") {
            showAdminUI(editor);

            document.getElementById('save-btn')?.addEventListener('click', async () => {
              try {
                await editor.save();
                toggleMode(editor, false);
              } catch (err) {
                console.error("Save failed", err);
              }
            });
          }
        }
      });

      cancelButton.addEventListener('click', async () => {
        try {
          console.log("canceling");
          cancelButton.innerText = "Reverting...";
          await editor.load(currentPage);
          toggleMode(editor, false);
        } catch (error) {
          console.error("Failed to revert changes:", error);
          alert("Error resetting editor.");
        } finally {
          cancelButton.innerText = "Cancel";
        }
      });
    }
  }
}
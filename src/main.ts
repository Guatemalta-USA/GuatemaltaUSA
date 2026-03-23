import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { createButton, createMessage } from "./modules/utils.js";
import { Message } from "./models.js";
import { TheEditor } from "./modules/editor.js";
import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";

let mobileNavToggle = document.getElementById("mobile-nav-toggle") as HTMLElement;
let nav: HTMLElement;

const editor = new TheEditor();
const viewSection = document.getElementById('content-display');
const editSection = document.getElementById('edit-section');
const adminControls = document.getElementById('admin-controls');
const cancelButton = document.getElementById('cancel-btn');

function toggleMode(isEditing: boolean) {
  if (viewSection && adminControls && editSection) {
    if (isEditing) {
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

function showAdminUI() {
  const editButton = createButton("Edit Page Content", "button", "edit-btn", "accent-button");
  editButton.addEventListener('click', async () => {
    toggleMode(true);
  });
  if (adminControls) {
    adminControls.appendChild(editButton);
    adminControls.classList.remove("hide");
  }
}

export async function initializeApp(partentPage: string, currentPage: string, editor_page_name?: string) {
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

  if (editor_page_name) {
    if (viewSection && cancelButton) {
      await editor.load(editor_page_name);
      viewSection.innerHTML = editor.getHTML();
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          const userRole = await getUserRole(user.uid);
          if (userRole === "admin") {
            showAdminUI();

            document.getElementById('save-btn')?.addEventListener('click', async () => {
              try {
                await editor.save();
                toggleMode(false);
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
          await editor.load(editor_page_name);
          toggleMode(false);
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
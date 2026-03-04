import { marked } from "marked";
import { initializeApp } from "./main.js";
import { createButton, createMessage, makeElement, markdownToHTML } from "./modules/utils.js";
import { auth } from "./firebase/firebase.js";
import { getUserRole } from "./firebase/authService.js";

const main = document.querySelector("main") as HTMLElement;
const contentSection = document.getElementById("content") as HTMLElement;
const editorSection = document.getElementById("editor") as HTMLElement;
const actionsSection = document.getElementById("actions") as HTMLElement;
let contentHTML = '';

function addEditButton() {
    const editButton = createButton("Edit", "button", "edit", "", "edit");
    editButton.addEventListener('click', () => {
        openEditor()
        editButton.remove();
    });
    actionsSection.appendChild(editButton);
}

async function updateContent(editForm: HTMLFormElement) {
    const formData: FormData = new FormData(editForm);
    const markdownContent = formData.get("editor-textarea");
    if (markdownContent) {
        let htmlContent = await markdownToHTML(markdownContent.toString());
        contentHTML = htmlContent;
        contentSection.innerHTML = contentHTML;
        editForm.remove();
        addEditButton();
    }
}


async function openEditor() {
    const editForm = makeElement("form", "edit-form", null, null) as HTMLFormElement;
    const editHeading = makeElement("h2", null, null, "Edit the contents of the homepage");
    editForm.appendChild(editHeading);
    const editBox = makeElement("textarea", "editor-textarea", null, null) as HTMLTextAreaElement;
    editBox.setAttribute('name', 'editor-textarea');
    editForm.appendChild(editBox);
    const buttonRow = makeElement("div", null, "button-row", null);
    const cancelButton = createButton("Cancel", "button", "cancel", "");
    cancelButton.addEventListener('click', () => {
        editForm.remove();
        addEditButton();
    });
    buttonRow.appendChild(cancelButton);
    const updateButton = createButton("Update", "submit", "update", "");
    buttonRow.appendChild(updateButton);
    editForm.appendChild(buttonRow);
    editorSection.appendChild(editForm);
    editForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const formData: FormData = new FormData(editForm);
        updateContent(editForm);
    });
}

initializeApp("Home", "Home").then(async () => {
    auth.onAuthStateChanged(async (user) => {
        const loading = document.getElementById("loading");
        if (user) {
            let userRole = await getUserRole(user.uid);
            if (userRole === "admin") {
                addEditButton();
            }
        }
        if (loading) loading.remove();
        contentSection.classList.remove("hide");
    });
});
import { initializeApp } from "./main.js";
import { createButton, makeElement, markdownCheatSheet } from "./modules/utils.js";
import { auth } from "./firebase/firebase.js";
import { getUserRole } from "./firebase/authService.js";
import { getPageContents, updatePageContents } from "./firebase/firebaseService.js";
import { PageContents } from "./models.js";
import { Timestamp } from "firebase/firestore";

const loading = document.getElementById("loading");
const contentSection = document.getElementById("content") as HTMLElement;
const editorSection = document.getElementById("editor") as HTMLElement;
const actionsSection = document.getElementById("actions") as HTMLElement;

let pageContents: PageContents | null = null;

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
        const updatedPageContents = new PageContents(
            "home",
            markdownContent.toString(),
            Timestamp.now()
        );
        await updatePageContents("home", updatedPageContents);
        await loadPageContents();
        editForm.remove();
        addEditButton();
    }
}


async function openEditor() {
    contentSection.classList.add("hide");
    // Add cheat sheet
    const cheatSheet = markdownCheatSheet();
    editorSection.appendChild(cheatSheet);
    //Add edit form
    const editForm = makeElement("form", "edit-form", null, null) as HTMLFormElement;
    const editHeading = makeElement("h2", null, null, "Edit the contents of the homepage");
    editForm.appendChild(editHeading);
    const editBox = makeElement("textarea", "editor-textarea", null, null) as HTMLTextAreaElement;
    editBox.setAttribute('name', 'editor-textarea');
    if (pageContents) {
        editBox.value = pageContents.markdown;
    }

    editForm.appendChild(editBox);
    const buttonRow = makeElement("div", null, "button-row", null);
    const cancelButton = createButton("Cancel", "button", "cancel", "");
    cancelButton.addEventListener('click', () => {
        editorSection.innerHTML = '';
        addEditButton();
        contentSection.classList.remove("hide");
    });
    buttonRow.appendChild(cancelButton);
    const updateButton = createButton("Update", "submit", "update", "");
    buttonRow.appendChild(updateButton);
    editForm.appendChild(buttonRow);
    editorSection.appendChild(editForm);
    editForm.addEventListener('submit', (e) => {
        e.preventDefault()
        updateContent(editForm);
        editorSection.innerHTML = '';
        contentSection.classList.remove("hide");
    });
}

async function loadPageContents() {
    pageContents = await getPageContents("home");
    if (pageContents) {
        console.log(pageContents);
        const pageContentsHTML = await pageContents.convertToHTML();
        contentSection.innerHTML = pageContentsHTML;
    }
}

initializeApp("Home", "Home").then(async () => {
    await loadPageContents();
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            let userRole = await getUserRole(user.uid);
            if (userRole === "admin") {
                addEditButton();
            }
        }
    });
    if (loading) loading.remove();
    contentSection.classList.remove("hide");
});
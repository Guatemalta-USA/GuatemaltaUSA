import { getAuthenticatedUser, getUserRole } from "./firebase/authService.js";
import { deleteProjectFromDonateList, getDonateButtonList, getProjectsByStatus, getUnpublishedProjects, setProjectLink, updateDonateListOrder, updateProjectsOrder } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import { Project, type Post, type ProjectInfo } from "./models.js";
import { navigateTo } from "./modules/navigate.js";
import { confirmDeleteModal, copyToClipboard, createButton, createMessage, createTableHeader, makeElement, promptModal, storeMessage } from "./modules/utils.js";
import { createDonateQRCodeWithLogo, createQRCodeWithLogo } from "./services/givebutter.service.js";

import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import Sortable from "sortablejs";

let donateButtonListLength: number = 0;

async function checkAdminPermissions(): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
            navigateTo('/');
            return false;
        }

        const role = await getUserRole(user.uid);

        if (role !== 'admin') {
            storeMessage({ messageBody: "Access denied. Admin privileges are required", location: "main-message", type: "error", i18n: "access_denied" });
            navigateTo('/');
            return false;
        }

        return true;
    } catch (authError) {
        console.error("Authorization check failed:", authError);
        storeMessage({ messageBody: "An error occurred verifying your permissions.", location: "main-message", type: "error" });
        navigateTo('/');
        return false;
    }
}

async function renderDonateListTable(container: HTMLElement) {
    container.innerHTML = "";

    const donateButtonLinks = await getDonateButtonList();
    donateButtonListLength = donateButtonLinks.length;
    const donateListTable = makeElement("table", "donate-list", null, null);

    // Header with extra column for Drag handle
    const donateListTableHeader = createTableHeader(["", "Project Name", "Share Link (click to copy to clipboard)", "Edit", "Delete"], "center");

    const donateListTableBody = donateButtonLinks.reduce((acc: HTMLElement, link: ProjectInfo) => {
        const tableRow = document.createElement("tr");
        const targetId = link.id || link.projectName;
        tableRow.setAttribute("data-id", targetId);

        // Drag Handle Cell
        const dragCell = document.createElement("td");
        const dragIcon = makeElement("span", null, "material-symbols-outlined drag-handle", "drag_indicator");
        dragCell.appendChild(dragIcon);

        const projectNameCell = makeElement("td", null, null, link["projectName"]);
        const shareLink = `https://guatemaltausa.org/donate?id=${link["formId"]}`;
        const shareLinkCell = makeElement("td", null, null, shareLink);
        shareLinkCell.addEventListener("click", async () => await copyToClipboard(shareLink));

        // Edit Button
        const editBtnCell = document.createElement("td");
        const editBtn = document.createElement("button") as HTMLButtonElement;
        editBtn.classList.add("table-button");
        editBtn.type = "button";
        const editIcon = makeElement("span", null, "material-symbols-outlined", "edit");
        editBtn.appendChild(editIcon);
        editBtn.addEventListener("click", async () => {
            const updateResponse = await promptModal(
                "Update the link for the Donate Button",
                ["Project Name", "Form ID"],
                "update",
                false,
                [link["projectName"], link["formId"]]
            );
            if (updateResponse) {
                const [updatedName, updatedFormId, updatedUrl] = updateResponse;
                if (updatedName.trim() !== "" && updatedFormId.trim() !== "" && updatedUrl.trim() !== "") {
                    const updatedProjectLink: ProjectInfo = {
                        ...(link.id && { id: link.id }),
                        projectName: updatedName,
                        projectId: updatedUrl,
                        formId: updatedFormId
                    };
                    await setProjectLink(updatedProjectLink);
                    createMessage({ messageBody: "Project updated successfully", location: "main-message", type: "check_circle", autoCloseSeconds: 5 });
                    await renderDonateListTable(container);
                }
            }
        });
        editBtnCell.appendChild(editBtn);

        // Delete Button
        const deleteBtnCell = document.createElement("td");
        const deleteBtn = document.createElement("button") as HTMLButtonElement;
        deleteBtn.classList.add("table-button");
        deleteBtn.type = "button";
        const deleteIcon = makeElement("span", null, "material-symbols-outlined", "delete");
        deleteBtn.appendChild(deleteIcon);
        deleteBtn.addEventListener("click", async () => {
            const confirmed = await confirmDeleteModal(
                `Remove ${link["projectName"]} from the Donate Button list?`,
                "Deleting this will NOT delete the project or make it unpublished"
            );
            if (confirmed) {
                try {
                    await deleteProjectFromDonateList(targetId);
                    createMessage({ messageBody: "Project deleted successfully", location: "main-message", type: "check_circle", autoCloseSeconds: 5 });
                    await renderDonateListTable(container); // Refresh table
                } catch (error: any) {
                    createMessage({ messageBody: error, location: "main-message", type: "error" });
                }
            }
        });
        deleteBtnCell.appendChild(deleteBtn);

        tableRow.append(dragCell, projectNameCell, shareLinkCell, editBtnCell, deleteBtnCell);
        acc.appendChild(tableRow);
        return acc;
    }, makeElement("tbody", "donate-list-tbody", null, null));

    donateListTable.append(donateListTableHeader, donateListTableBody);
    container.appendChild(donateListTable);

    Sortable.create(donateListTableBody, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: async () => {
            const updatedRows = Array.from(donateListTableBody.children) as HTMLElement[];

            const orderUpdates = updatedRows.map((row, index) => ({
                id: row.getAttribute("data-id")!,
                newOrderIndex: index + 1
            }));

            try {
                await updateDonateListOrder(orderUpdates);
                createMessage({ messageBody: "Donate list order updated successfully", location: "main-message", type: "check_circle", autoCloseSeconds: 3 });
            } catch (error) {
                createMessage({ messageBody: "Failed to save donate list order", location: "main-message", type: "error" });
            }
        }
    });
}

function renderQRCodeCanvasControls(
    qrCanvasSection: HTMLElement,
    generateButtons: HTMLElement,
    canvas: HTMLCanvasElement,
    filename: string
) {
    qrCanvasSection.innerHTML = "";
    generateButtons.classList.add("hide");
    qrCanvasSection.classList.remove("hide");

    qrCanvasSection.appendChild(canvas);

    const downloadBtn = createButton({ buttonText: "Download QR Code", buttonType: "button", buttonId: "download", buttonClass: "accent-button", icon: "download" });
    downloadBtn.onclick = function () {
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            a.click();
        } catch (err) {
            createMessage({ messageBody: `Could not download image: ${err}`, location: "main-message", type: "error" });
        }
    };

    const newBtn = createButton({ buttonText: "Generate new QR Code", buttonType: "button", buttonId: "new", buttonClass: "accent-button", icon: "add" });
    newBtn.onclick = function () {
        qrCanvasSection.classList.add("hide");
        generateButtons.classList.remove("hide");
    };

    const btnRow = makeElement("div", null, "button-row left", null);
    btnRow.append(downloadBtn, newBtn);
    qrCanvasSection.appendChild(btnRow);
}

function setupQRCodeGeneratorSection() {
    const generateButtons = document.getElementById("generate-buttons") as HTMLElement;
    const qrCanvasSection = document.getElementById("qr-canvas") as HTMLElement;
    const generateH2 = makeElement("h2", null, null, "Generate QR Codes");

    // Donate QR Code Block
    const donateGenerateH3 = makeElement("h3", null, null, "Donate QR Code");
    const donateP = makeElement("p", null, null, "Generate a QR Code that links to the donate form for a project");
    const generateDonateBtn = createButton({ buttonText: "Generate Donate QR", buttonType: "button", buttonId: "donate-qr", buttonClass: "accent-button" });

    generateDonateBtn.addEventListener("click", async () => {
        const campaignID = await promptModal(
            "Enter the campaign Id\n(found in the embed code of the form widget)",
            ["Campaign ID"],
            "Generate",
            false
        );
        if (campaignID) {
            const cID = campaignID[0];
            if (cID.trim() !== "") {
                try {
                    const canvas = await createDonateQRCodeWithLogo(cID);
                    renderQRCodeCanvasControls(qrCanvasSection, generateButtons, canvas, `donate-${cID}.png`);
                } catch (error) {
                    console.error('Error generating QR code:', error);
                }
            }
        }
    });

    // Link QR Code Block
    const linkGenerateH3 = makeElement("h3", null, null, "Link QR Code");
    const linkP = makeElement("p", null, null, "Generate a QR code that goes to a link");
    const generateLinkBtn = createButton({ buttonText: "Generate Link QR", buttonType: "button", buttonId: "link-qr", buttonClass: "accent-button" });

    generateLinkBtn.addEventListener("click", async () => {
        const url = await promptModal(
            "Enter the url",
            ["url"],
            "Generate",
            false
        );
        if (url) {
            const urlString = url[0];
            if (urlString.trim() !== "") {
                try {
                    const canvas = await createQRCodeWithLogo(urlString);
                    const urlName = urlString.split(".")[1] || "qr";
                    renderQRCodeCanvasControls(qrCanvasSection, generateButtons, canvas, `${urlName}-gusa.png`);
                } catch (error) {
                    console.error('Error generating QR code:', error);
                }
            }
        }
    });

    generateButtons.append(
        generateH2,
        donateGenerateH3,
        donateP,
        generateDonateBtn,
        linkGenerateH3,
        linkP,
        generateLinkBtn
    );
}

function renderPostsOrProjects(itemArray: Post[] | Project[], container: HTMLElement) {
    container.innerHTML = "";

    const table = makeElement("table", null, null, null);
    const headers = createTableHeader(["", "Name", "view", "Edit"], "center");

    const tbody = itemArray.reduce((acc: HTMLElement, item: Post | Project) => {
        const tableRow = document.createElement("tr");
        
        // Ensure targetId gets a valid ID string
        const targetId = item.id ? String(item.id) : item.getTitle("en");
        tableRow.setAttribute("data-id", targetId);

        // Drag handle cell
        const dragCell = document.createElement("td");
        const dragIcon = makeElement("span", null, "material-symbols-outlined drag-handle", "drag_indicator");
        dragCell.appendChild(dragIcon);

        const itemID = item.id ? String(item.id) : "";

        // Name cell
        const nameCell = makeElement("td", null, null, item.getTitle("en"));

        // View button cell
        const viewBtnCell = document.createElement("td");
        const viewBtn = document.createElement("button") as HTMLButtonElement;
        viewBtn.classList.add("table-button");
        viewBtn.type = "button";
        const viewIcon = makeElement("span", null, "material-symbols-outlined", "visibility");
        viewBtn.appendChild(viewIcon);
        viewBtn.addEventListener("click", () => {
            if (item instanceof Project) {
                navigateTo("/impact/project", { params: { id: itemID } });
            } else {
                navigateTo("/blog/post", { params: { id: itemID } });
            }
        });
        viewBtnCell.appendChild(viewBtn);

        // Edit button cell
        const editBtnCell = document.createElement("td");
        const editBtn = document.createElement("button") as HTMLButtonElement;
        editBtn.classList.add("table-button");
        editBtn.type = "button";
        const editIcon = makeElement("span", null, "material-symbols-outlined", "edit");
        editBtn.appendChild(editIcon);
        editBtn.addEventListener("click", () => {
            if (item instanceof Project) {
                navigateTo("/impact/editproject", { params: { id: itemID } });
            } else {
                navigateTo("/blog/editpost", { params: { id: itemID } });
            }
        });
        editBtnCell.appendChild(editBtn);

        tableRow.append(dragCell, nameCell, viewBtnCell, editBtnCell);
        acc.appendChild(tableRow);
        return acc;
    }, makeElement("tbody", null, null, null));

    table.append(headers, tbody);
    container.appendChild(table);

    const isProjectList = itemArray.length > 0 && itemArray[0] instanceof Project;

    if (isProjectList) {
        Sortable.create(tbody, {
            animation: 150,
            handle: ".drag-handle",
            ghostClass: "sortable-ghost",
            onEnd: async () => {
                const updatedRows = Array.from(tbody.children) as HTMLElement[];
                const orderUpdates = updatedRows.map((row, index) => ({
                    id: row.getAttribute("data-id")!,
                    newOrderIndex: index + 1
                }));

                try {
                    await updateProjectsOrder(orderUpdates);
                    createMessage({
                        messageBody: "Projects order updated successfully",
                        location: "main-message",
                        type: "check_circle",
                        autoCloseSeconds: 3
                    });
                } catch (err) {
                    console.error(err);
                    createMessage({
                        messageBody: "Failed to save Projects order",
                        location: "main-message",
                        type: "error"
                    });
                }
            }
        });
    }
}

async function renderUnpublishedSection() {
    const unpublishedSection = document.getElementById("unpublished") as HTMLElement;

    const unpublishedProjects = await getUnpublishedProjects();

    if (unpublishedProjects.length === 0) {
        unpublishedSection.remove();
        return;
    }
    renderPostsOrProjects(unpublishedProjects, unpublishedSection);
    const unpublishedH2 = makeElement("h2", null, null, "Unpublished Projects");
    unpublishedSection.prepend(unpublishedH2);
    unpublishedSection.classList.remove("hide");
}

async function renderCurrentSection() {
    const currentSection = document.getElementById("current") as HTMLElement;
    currentSection.innerHTML = "";

    const currentProjects = await getProjectsByStatus(true);

    if (currentProjects.length === 0) {
        currentSection.remove();
        return;
    }

    renderPostsOrProjects(currentProjects, currentSection);
    const currentH2 = makeElement("h2", null, null, "Current Projects");
    currentSection.prepend(currentH2);
    currentSection.classList.remove("hide");
}

async function renderDonateSection() {
    const donateListSection = document.getElementById("donate-list") as HTMLElement;
    const donateListH2 = makeElement("h2", null, null, "Donate Button List");
    const tableContainer = makeElement("div", "donate-list-table-container", null, null);

    const addProjectToDonate = createButton({ buttonText: "Add project to donate list", buttonType: "button", buttonId: "add-project", buttonClass: "accent-button", icon: "add" });
    addProjectToDonate.addEventListener("click", async () => {
        const projectInfo = await promptModal(
            "Enter the ID from the form widget\nEnter the url path of the project",
            ["Project name in list", "form ID", "project url path"],
            "add",
            false
        );
        if (projectInfo) {
            const [projectName, formID, projectURLPath] = projectInfo;
            if (projectName.trim() !== "" && formID.trim() !== "" && projectURLPath.trim() !== "") {
                const newProject: ProjectInfo = {
                    projectName: projectName,
                    projectId: projectURLPath,
                    formId: formID,
                    orderIndex: donateButtonListLength + 1
                };
                try {
                    await setProjectLink(newProject);
                    createMessage({ messageBody: "Project Added to Donate Button List", location: "main-message", type: "check_circle" });
                    await renderDonateListTable(tableContainer); // Refresh table
                } catch (error: any) {
                    createMessage({ messageBody: error, location: "main-message", type: "error" });
                }
            }
        }
    });

    donateListSection.append(donateListH2, tableContainer, addProjectToDonate);
    await renderDonateListTable(tableContainer);
}

async function setUpAdminPage() {
    initializeApp("Admin", "Admin");

    const isAdmin = await checkAdminPermissions();
    if (!isAdmin) return;

    setupQRCodeGeneratorSection();
    await renderUnpublishedSection();
    await renderCurrentSection();
    await renderDonateSection();
}

setUpAdminPage();
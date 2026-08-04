import { getAuthenticatedUser, getUserRole } from "./firebase/authService.js";
import { deleteProjectFromDonateList, getDonateButtonList, getUnpublishedProjects, setProjectLink } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Project, ProjectInfo } from "./models.js";
import { navigateTo } from "./modules/navigate.js";
import { confirmDeleteModal, copyToClipboard, createButton, createMessage, createTableHeader, makeElement, promptModal, storeMessage } from "./modules/utils.js";
import { createDonateQRCodeWithLogo, createQRCodeWithLogo } from "./services/givebutter.service.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

async function checkAdminPermissions(): Promise<boolean> {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            storeMessage("Access denied. Admin privileges are required.", "main-message", "error");
            navigateTo('/');
            return false;
        }

        const role = await getUserRole(user.uid);

        if (role !== 'admin') {
            storeMessage("Access denied. Admin privileges are required.", "main-message", "error");
            navigateTo('/');
            return false;
        }

        return true;
    } catch (authError) {
        console.error("Authorization check failed:", authError);
        storeMessage("An error occurred verifying your permissions.", "main-message", "error");
        navigateTo('/');
        return false;
    }
}

async function renderDonateListTable(container: HTMLElement) {
    container.innerHTML = ""; // Clear existing table contents

    const donateButtonLinks = await getDonateButtonList();
    const donateListTable = makeElement("table", "donate-list", null, null);
    const donateListTableHeader = createTableHeader(["Project Name", "Share Link (click to copy to clipboard)", "Edit", "Delete"], "center");

    const donateListTableBody = donateButtonLinks.reduce((acc: HTMLElement, link: ProjectInfo) => {
        const tableRow = document.createElement("tr");
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
                const [updatedName, updatedFormId] = updateResponse;
                if (updatedName.trim() !== "" && updatedFormId.trim() !== "") {
                    const updatedProjectLink: ProjectInfo = {
                        ...(link.id && { id: link.id }),
                        projectName: updatedName,
                        formId: updatedFormId
                    };
                    await setProjectLink(updatedProjectLink);
                    createMessage("Project updated successfully", "main-message", "check_circle");
                    await renderDonateListTable(container); // Refresh table
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
                    const targetId = link.id || link.projectName;
                    await deleteProjectFromDonateList(targetId);
                    createMessage("Project deleted successfully", "main-message", "check_circle");
                    await renderDonateListTable(container); // Refresh table
                } catch (error: any) {
                    createMessage(error, "main-message", "error");
                }
            }
        });
        deleteBtnCell.appendChild(deleteBtn);

        tableRow.append(projectNameCell, shareLinkCell, editBtnCell, deleteBtnCell);
        acc.appendChild(tableRow);
        return acc;
    }, makeElement("tbody", null, null, null));

    donateListTable.append(donateListTableHeader, donateListTableBody);
    container.appendChild(donateListTable);
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
            createMessage(`Could not download image: ${err}`, "main-message", "error");
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

function setupQRCodeGeneratorSection(generateButtons: HTMLElement, qrCanvasSection: HTMLElement) {
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

async function renderUnpublishedSection(unpublishedSection: HTMLElement) {
    const unpublishedH2 = makeElement("h2", null, null, "Unpublished Projects");
    unpublishedSection.append(unpublishedH2);
    
    const unpublishedProjects = await getUnpublishedProjects();
    
    if (unpublishedProjects.length === 0) {
        unpublishedSection.remove();
        return;
    }

    const unpublishedProjectsList = unpublishedProjects.reduce((acc: HTMLElement, project: Project) => {
        const projectId = project["id"] ? project["id"] : "";
        const article = makeElement("article", projectId, "card", null);
        
        const projectLink = makeElement("a", null, "post-link", null);
        projectLink.addEventListener("click", () => navigateTo("/impact/project", { params: { id: projectId } }));
        
        const titleH2 = makeElement("h2", null, null, project["projectTitle"].en);
        projectLink.appendChild(titleH2);
        
        const lastUpdatedDate = (project as any).lastUpdated.toDate();
        const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const lastUpdated = makeElement("p", null, null, `Last updated: ${lastUpdatedStr}`);
        
        const btnRow = makeElement("div", null, "button-row left", null);
        const viewButton = createButton({ buttonText: "View", buttonType: "button", buttonId: "view-project", buttonClass: "accent-button", icon: "visibility" });
        viewButton.addEventListener("click", () => navigateTo("/impact/project", { params: { id: projectId } }));
        
        const editButton = createButton({ buttonText: "Edit", buttonType: "button", buttonId: "edit-project", buttonClass: "accent-button", icon: "edit" });
        editButton.addEventListener("click", () => navigateTo("/impact/editproject", { params: { id: projectId } }));
        
        btnRow.append(viewButton, editButton);
        article.append(projectLink, lastUpdated, btnRow);
        acc.appendChild(article);
        return acc;
    }, makeElement("div", "unpublished-projects", null, null));

    unpublishedSection.appendChild(unpublishedProjectsList);
}

async function renderDonateSection(donateListSection: HTMLElement) {
    const donateListH2 = makeElement("h2", null, null, "Donate Button List");
    const tableContainer = makeElement("div", "donate-list-table-container", null, null);

    const addProjectToDonate = createButton({ buttonText: "Add project to donate list", buttonType: "button", buttonId: "add-project", buttonClass: "accent-button", icon: "add" });
    addProjectToDonate.addEventListener("click", async () => {
        const projectInfo = await promptModal(
            "Add project to donate list\n(enter the ID in the form widget)",
            ["Project name in list", "form ID"],
            "add",
            false
        );
        if (projectInfo) {
            const [projectName, formID] = projectInfo;
            if (projectName.trim() !== "" && formID.trim() !== "") {
                const newProject: ProjectInfo = {
                    projectName: projectName,
                    formId: formID
                };
                try {
                    await setProjectLink(newProject);
                    createMessage("Project Added to Donate Button List", "main-message", "check_circle");
                    await renderDonateListTable(tableContainer); // Refresh table
                } catch (error: any) {
                    createMessage(error, "main-message", "error");
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

    const generateButtons = document.getElementById("generate-buttons") as HTMLElement;
    const qrCanvasSection = document.getElementById("qr-canvas") as HTMLElement;
    const unpublishedSection = document.getElementById("unpublished") as HTMLElement;
    const donateListSection = document.getElementById("donate-list") as HTMLElement;

    setupQRCodeGeneratorSection(generateButtons, qrCanvasSection);
    await renderUnpublishedSection(unpublishedSection);
    await renderDonateSection(donateListSection);
}

setUpAdminPage();
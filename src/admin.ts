import { getAuthenticatedUser, getUserRole } from "./firebase/authService.js";
import { getUnpublishedProjects } from "./firebase/firebaseService.js";
import { initializeApp } from "./main.js";
import type { Project } from "./models.js";
import { navigateTo } from "./modules/navigate.js";
import { createButton, createMessage, makeElement, promptModal, storeMessage } from "./modules/utils.js";
import { createDonateQRCodeWithLogo, createQRCodeWithLogo } from "./services/givebutter.service.js";

async function setUpAdminPage() {
    initializeApp("Admin", "Admin");

    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            storeMessage("Access denied. Admin privileges are required.", "main-message", "error");
            navigateTo('/');
            return;
        }
        const role = await getUserRole(user.uid);

        if (role !== 'admin') {
            storeMessage("Access denied. Admin privileges are required.", "main-message", "error");
            navigateTo('/');
            return;
        }
    } catch (authError) {
        console.error("Authorization check failed:", authError);
        storeMessage("An error occurred verifying your permissions.", "main-message", "error");
        navigateTo('/');
        return;
    }


    const generateButtons = document.getElementById("generate-buttons") as HTMLElement;
    const qrCanvasSection = document.getElementById("qr-canvas") as HTMLElement;
    const unpublishedSection = document.getElementById("unpublished") as HTMLElement;

    const generateH2 = makeElement("H2", null, null, "Generate QR Codes");
    const donateGenerateH3 = makeElement("h3", null, null, "Donate QR Code");
    const donateP = makeElement("p", null, null, "Generate a QR Code that links to the donate form for a project");
    const generateDonateBtn = createButton("Generate Donate QR", "button", "donate-qr", "accent-button");
    generateDonateBtn.addEventListener("click", async () => {
        const campaignID = await promptModal("Enter the campaign Id\n(found in the embed code of the form widget)", "Campaign ID", "Generate", false);
        if (campaignID.trim() !== "") {
            qrCanvasSection.innerHTML = "";
            generateButtons.classList.add("hide");
            try {
                qrCanvasSection.classList.remove("hide");
                const canvas = await createDonateQRCodeWithLogo(campaignID);
                qrCanvasSection.appendChild(canvas);
                const downloadBtn = createButton("Download QR Code", "button", "download", "accent-button", "download");
                downloadBtn.onclick = function () {
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = `donate-${campaignID}.png`
                        a.click();
                    } catch (err) {
                        createMessage(`Could not download image: ${err}`, "main-message", "error");
                    }
                }
                const newBtn = createButton("Generate new QR Code", "button", "new", "accent-button");
                newBtn.onclick = function () {
                    qrCanvasSection.classList.add("hide");
                    generateButtons.classList.remove("hide");
                }
                qrCanvasSection.append(downloadBtn, newBtn);
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }
    });
    generateButtons.append(generateH2, donateGenerateH3, donateP, generateDonateBtn);

    const linkGenerateH3 = makeElement("h3", null, null, "Link QR Code");
    const linkP = makeElement("p", null, null, "Generate a QR code that goes to a link");
    const generateLinkBtn = createButton("Generate Link QR", "button", "link-qr", "accent-button");
    generateLinkBtn.addEventListener("click", async () => {
        const url = await promptModal("Enter the url", "url", "Generate", false);
        if (url.trim() !== "") {
            qrCanvasSection.innerHTML = "";
            generateButtons.classList.add("hide");
            try {
                qrCanvasSection.classList.remove("hide");
                const canvas = await createQRCodeWithLogo(url);
                qrCanvasSection.appendChild(canvas);
                const downloadBtn = createButton("Download QR Code", "button", "download", "accent-button", "download");
                downloadBtn.onclick = function () {
                    try {
                        const dataUrl = canvas.toDataURL('image/png');
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        const urlName = url.split(".")[1];
                        a.download = `${urlName}-gusa.png`
                        a.click();
                    } catch (err) {
                        createMessage(`Could not download image: ${err}`, "main-message", "error");
                    }
                }
                const newBtn = createButton("Generate new QR Code", "button", "new", "accent-button");
                newBtn.onclick = function () {
                    qrCanvasSection.classList.add("hide");
                    generateButtons.classList.remove("hide");
                }
                qrCanvasSection.append(downloadBtn, newBtn);
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        }
    });
    generateButtons.append(linkGenerateH3, linkP, generateLinkBtn);

    const unpublishedH2 = makeElement("h2", null, null, "Unpublished Projects");

    unpublishedSection.append(unpublishedH2);
    const unpublishedProjects = await getUnpublishedProjects();
    const unpublishedProjectsList = unpublishedProjects.reduce((acc: HTMLElement, project: Project) => {
        const article = makeElement("article", project["id"] ? project["id"] : "", null, null);
        const projectLink = makeElement("a", null, "post-link", null);
        const projectId = project["id"] ? project["id"] : "";
        projectLink.addEventListener("click", () => navigateTo("/impact/editproject", { params: { id: projectId } }));
        const titleH2 = makeElement("h2", null, null, project["projectTitle"]);
        projectLink.appendChild(titleH2);
        const lastUpdatedDate = project["lastUpdated"].toDate();
        const lastUpdatedStr = lastUpdatedDate.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const lastUpdated = makeElement("p", null, null, `Last updated: ${lastUpdatedStr}`);
        article.append(projectLink, lastUpdated);
        acc.appendChild(article);
        return acc;
    }, makeElement("div", "unpublished-projects", null, null));
    unpublishedSection.appendChild(unpublishedProjectsList);
}

setUpAdminPage();
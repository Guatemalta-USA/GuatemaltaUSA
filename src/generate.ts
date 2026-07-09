import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { initializeApp } from "./main.js";
import { navigateTo } from "./modules/navigate.js";
import { createButton, createMessage, makeElement, promptModal, storeMessage } from "./modules/utils.js";
import { createQRCodeWithLogo, createDonateQRCodeWithLogo } from "./services/givebutter.service.js";

const buttonsSection = document.getElementById("buttons") as HTMLElement;
const qrCanvasSection = document.getElementById("qr-canvas") as HTMLElement;

initializeApp("Generate", "Generate").then(async () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role !== "admin") {
                storeMessage("Access denied. Admin privileges are required to view the page.", "main-message", "error");
                navigateTo("/");
            } else {
                const generateH2 = makeElement("H2", null, null, "Generate QR Codes");

                const donateGenerateH3 = makeElement("h3", null, null, "Donate QR Code");
                const donateP = makeElement("p", null, null, "Generate a QR Code that links to the donate form for a project");
                const generateDonateBtn = createButton("Generate Donate QR", "button", "donate-qr", "accent-button");
                generateDonateBtn.addEventListener("click", async () => {
                    const campaignID = await promptModal("Enter the campaign Id\n(found in the embed code of the form widget)", "Campaign ID", "Generate", false);
                    if (campaignID.trim() !== "") {
                        qrCanvasSection.innerHTML = "";
                        buttonsSection.classList.add("hide");
                        try {
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
                                buttonsSection.classList.remove("hide");
                             }
                            qrCanvasSection.append(downloadBtn, newBtn);
                        } catch (error) {
                            console.error('Error generating QR code:', error);
                        }
                    }
                });
                buttonsSection.append(generateH2, donateGenerateH3, donateP, generateDonateBtn);

                const linkGenerateH3 = makeElement("h3", null, null, "Link QR Code");
                const linkP = makeElement("p", null, null, "Generate a QR code that goes to a link");
                const generateLinkBtn = createButton("Generate Link QR", "button", "link-qr", "accent-button");
                generateLinkBtn.addEventListener("click", async () => {
                    const url = await promptModal("Enter the url", "url", "Generate", false);
                    if (url.trim() !== "") {
                        qrCanvasSection.innerHTML = "";
                        buttonsSection.classList.add("hide");
                        try {
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
                                buttonsSection.classList.remove("hide");
                             }
                            qrCanvasSection.append(downloadBtn, newBtn);
                        } catch (error) {
                            console.error('Error generating QR code:', error);
                        }
                    }
                });
                buttonsSection.append(linkGenerateH3, linkP, generateLinkBtn);
            }
        } else {
            storeMessage("You are not authorized to view that page", "main-message", "error");
            navigateTo("/");
        }
    });

});
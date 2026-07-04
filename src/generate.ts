import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { initializeApp } from "./main.js";
import { navigateTo } from "./modules/navigate.js";
import { createButton, createMessage, storeMessage } from "./modules/utils.js";
import { createQRCodeWithLogo } from "./services/givebutter.service.js";

const qrForm = document.getElementById("qr-form") as HTMLFormElement;
const qrSection = document.getElementById("generate-qr-code") as HTMLElement;

initializeApp("Generate", "Generate").then(async () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role !== "admin") {
                qrSection.remove();
                storeMessage("Access denied. Admin privileges are required to view the page.", "main-message", "error");
                navigateTo("/");
            } else {
                qrSection.classList.remove("hide");
                qrForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const formData = new FormData(qrForm);
                    const campaignIDInput = formData.get("campaign-id");
                    let campaignId = ""

                    if (!campaignIDInput || campaignIDInput.toString().trim() === "") {
                        createMessage("Please enter the campaign ID", "main-message", "error");
                        return;
                    } else {
                        campaignId = campaignIDInput.toString().trim();
                    }
                    try {
                        const canvas = await createQRCodeWithLogo(campaignId);
                        qrSection.appendChild(canvas);
                        const downloadBtn = createButton("Download QR Code", "button", "download", "accent-button", "download");
                        downloadBtn.onclick = function () {
                            try {
                                const dataUrl = canvas.toDataURL('image/png');
                                const a = document.createElement('a');
                                a.href = dataUrl;
                                a.download = `donate-${campaignId}.png`
                                a.click();
                            } catch (err) {
                                createMessage(`Could not download image: ${err}`, "main-message", "error");
                            }
                        }
                        qrForm.reset();
                        const newBtn = createButton("Generate new QR Code", "button", "new", "accent-button");
                        newBtn.onclick = function () { window.location.reload() }
                        qrSection.append(downloadBtn, newBtn);
                        qrForm.remove();
                    } catch (error) {
                        console.error('Error generating QR code:', error);
                    }
                });
            }
        } else {
            qrSection.remove();
            storeMessage("You are not authorized to view that page", "main-message", "error");
            navigateTo("/");
        }
    });

});
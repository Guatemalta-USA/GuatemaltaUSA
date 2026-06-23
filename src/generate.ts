import { initializeApp } from "./main.js";
import { createButton, createMessage } from "./modules/utils.js";
import { createQRCodeWithLogo } from "./services/givebutter.service.js";

initializeApp("Generate", "Generate").then(async () => {
    const qrForm = document.getElementById("qr-form") as HTMLFormElement;
    const qrSection = document.getElementById("generate-qr-code") as HTMLElement;
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
            newBtn.onclick = function() {window.location.reload()}
            qrSection.append(downloadBtn, newBtn);
            qrForm.remove();
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    });
});
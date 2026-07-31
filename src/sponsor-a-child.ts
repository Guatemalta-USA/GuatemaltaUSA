import { getUserRole } from "./firebase/authService.js";
import { auth } from "./firebase/firebase.js";
import { initializeApp } from "./main.js";
import { confirmDeleteModal, createButton, createInputRow, createMessage, makeElement } from "./modules/utils.js";
import type { ChildSponsorship, refStatus } from "./models.js";
import { addChildSponsorship, deleteChildSponsorship, getAllChildSponsorshipsByYear, getAllDonors, updateDonor, validateReferralCode } from "./firebase/firebaseService.js";
import { deleteImage, resizeImage, uploadImage } from "./modules/imageService.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

await initializeApp("Impact", "Sponsor A Child");


const params = new URLSearchParams(window.location.search);
const refCode = params.get("ref");
let validation: refStatus = { isValid: false, donorName: "", hasClaimed: false };
if (refCode) {
    validation = await validateReferralCode(refCode);
    if (!validation.isValid) {
        if (validation.error) createMessage(validation.error, "main-message", "error");
    } else if (!validation.childName) {
        createMessage(`Welcome ${validation.donorName}, Please select a child to sponsor`, "main-message", "info");
    } else {
        createMessage(`Welcome ${validation.donorName}`, "main-message", "info");
    }
}

let currentUserRole: string | null = null;
const loading = document.getElementById("loading");
const adminButtons = document.getElementById("admin-actions") as HTMLElement;
const sponsorshipsSection = document.getElementById("sponsorships") as HTMLElement;
const years: number[] = [2026];
const tabContainer = makeElement("div", "tab-navigation", "tab-container hide", null);
const sponsorshipTabBtn = createButton("Sponsorships", "button", "tab-sponsorships", "tab-btn active");
const donorTabBtn = createButton("Donors", "button", "tab-donors", "tab-btn");

tabContainer.append(sponsorshipTabBtn, donorTabBtn);
sponsorshipsSection.before(tabContainer);
const donorSection = makeElement("div", "donor-list-section", "hide", null);
donorSection.style.textAlign = "canter";
sponsorshipsSection.after(donorSection);

sponsorshipTabBtn.addEventListener("click", () => {
    sponsorshipTabBtn.classList.add("active");
    donorTabBtn.classList.remove("active");
    sponsorshipsSection.classList.remove("hide");
    donorSection.classList.add("hide");
});

donorTabBtn.addEventListener("click", async () => {
    donorTabBtn.classList.add("active");
    sponsorshipTabBtn.classList.remove("active");
    donorSection.classList.remove("hide");
    sponsorshipsSection.classList.add("hide");
    await updateDonorSection();
});

auth.onAuthStateChanged(async (user) => {
    adminButtons.innerHTML = "";
    tabContainer.classList.add("hide");

    if (user) {
        currentUserRole = await getUserRole(user.uid);

        if (currentUserRole === "admin") {
            tabContainer.classList.remove("hide");

            document.getElementById("new-child")?.remove();
            const newSponsorshipBtn = createButton("Add Child to sponsor", "button", "new-child-btn", "accent-button", "add");
            newSponsorshipBtn.addEventListener("click", () => openSponsorshipModal());
            adminButtons.append(newSponsorshipBtn);
            adminButtons.classList.remove("hide");
        }
    } else {
        currentUserRole = null;
        adminButtons.classList.add("hide");
        sponsorshipTabBtn.classList.add("active");
        donorTabBtn.classList.remove("active");
        sponsorshipsSection.classList.remove("hide");
        donorSection.classList.add("hide");
    }

    await updateSponsorshipSection();
});

async function submitData(formData: FormData): Promise<boolean> {
    return new Promise(async (resolve) => {
        let newChild: ChildSponsorship = {
            name: "",
            year: 0,
            bio: "",
            photoURL: "",
            sponsor: null
        }

        const name = formData.get("child-name");
        if (!name || name.toString().trim() === "") {
            createMessage("Please enter the name of the child", "main-message", "error");
            resolve(false);
        } else {
            newChild["name"] = name.toString().trim();
        }

        const year = formData.get("year");
        if (!year) {
            createMessage("Please enter the year of the sponsorship", "main-message", "error");
            resolve(false);
        } else {
            newChild["year"] = parseInt(year as string, 10);
        }

        const bio = formData.get("bio");
        if (!bio || bio.toString().trim() === "") {
            createMessage("Please enter the bio for the child", "main-message", "error");
            resolve(false);
        } else {
            newChild["bio"] = bio.toString().trim();
        }

        const photoInput = document.getElementById("photoFile") as HTMLInputElement;
        const file = photoInput.files?.[0];
        if (file) {
            const resizedBlob = await resizeImage(file, 800, 800);
            newChild["photoURL"] = await uploadImage(resizedBlob as File);
        }

        try {
            await addChildSponsorship(newChild);
            resolve(true);
        } catch (error: any) {
            createMessage(error, "main-message", "error");
            resolve(false);
        }
    });
}

async function updateDonorSection() {
    donorSection.innerHTML = "";

    const donors = await getAllDonors();
    if (donors.length === 0) {
        const noDonorsMsg = makeElement("p", null, "info-message", "No donors yet");
        donorSection.appendChild(noDonorsMsg);
        return;
    }

    const donorContainer = makeElement("div", "donor-list", "sponsor-container", null)

    for (const donor of donors) {
        const nextDonor = makeElement("article", donor["donorName"], "sponsor-card", null);
        const name = makeElement("h3", null, null, `${donor["donorName"]} (${donor["year"]})`);
        const donorInfo = document.createElement("p");
        donorInfo.textContent = `Email: ${donor["donorEmail"]}\nReferral Code: ${donor["refCode"]}\nSelected Child: ${donor["selectedChildName"] ? donor["selectedChildName"] : "Not yet selected"}`;
        donorInfo.style.whiteSpace = "pre-line";
        nextDonor.append(name, donorInfo);
        donorContainer.appendChild(nextDonor);
    }
    donorSection.appendChild(donorContainer);
}

async function updateSponsorshipSection() {
    sponsorshipsSection.innerHTML = "";
    if (validation.hasClaimed && validation.childName) {
        const sponsorMessage = makeElement("h2", null, null, `Thank you for sponsoring ${validation.childName}`);
        sponsorshipsSection.appendChild(sponsorMessage);
    }

    for (const year of years) {
        const childrenForYear = await getAllChildSponsorshipsByYear(year);

        const yearHeading = makeElement("h2", null, null, `${year} children`);
        yearHeading.style.textAlign = "center";
        const yearBlock = makeElement("div", `${year}-children`, "sponsor-container", null);

        for (const child of childrenForYear) {
            const nextChild = makeElement("article", child["name"], "sponsor-card", null);
            const header = makeElement("div", null, "sponsorship-header", null);

            const photo = document.createElement("img") as HTMLImageElement;
            photo.src = child["photoURL"];
            photo.alt = child["name"];

            const childInfo = makeElement("div", null, "child-info", null);
            const nameH3 = makeElement("h3", null, null, child["name"]);
            childInfo.append(nameH3);

            if (child["sponsor"]) {
                const statusText = currentUserRole === "admin"
                    ? `Sponsored: ${child["sponsor"]}`
                    : "Sponsored";

                const sponsored = makeElement("span", null, "sponsored found", statusText);
                childInfo.appendChild(sponsored);
            } else {
                const notSponsored = makeElement("span", null, "sponsored not-found", "Waiting for sponsor");
                childInfo.appendChild(notSponsored);
            }

            header.append(photo, childInfo);
            const bioP = makeElement("p", null, null, child["bio"]);
            nextChild.append(header, bioP);
            if (currentUserRole === "admin") {
                const deleteBtn = createButton("Delete", "button", `delete-${child["name"]}`, "delete-button", "delete");
                deleteBtn.onclick = async () => {
                    const response = await confirmDeleteModal("Confirm Deletion", `Are you sure you want to remove ${child["name"]}?`)
                    if (response) {
                        if (child["photoURL"]) {
                            await deleteImage(child["photoURL"]);
                        }
                        await deleteChildSponsorship(child["name"]);
                        await updateSponsorshipSection();
                    }
                };
                nextChild.appendChild(deleteBtn);
            }
            if (validation.isValid && !validation.hasClaimed && !child["sponsor"]) {
                const selectBtn = createButton("Select child", "button", `select-${child["name"]}`, "accent-button", "check");
                selectBtn.onclick = async () => {
                    try {
                        if (refCode) {
                            const result = await updateDonor(refCode, child["name"])
                            if (result) {
                                createMessage("Sponsorship successfully processed!", "main-message", "check_circle");
                                window.location.reload();
                            }
                        }

                    } catch (error: any) {
                        createMessage(error, "main-message", "error");
                    }
                };
                nextChild.appendChild(selectBtn);
            }
            yearBlock.appendChild(nextChild);
        }

        sponsorshipsSection.append(yearHeading, yearBlock);
    }
}

async function openSponsorshipModal() {
    const modalRoot = makeElement("div", "modal-root", null, null);
    const modalOverlay = makeElement("div", null, "modal-overlay", null);
    const modalContent = makeElement("form", null, "modal-content", null) as HTMLFormElement;

    const modalH2 = makeElement("h2", null, null, "Add new child to sponsor");
    modalContent.appendChild(modalH2);

    const nameRow = createInputRow(null, "text", "Name", "child-name") as HTMLInputElement;
    const yearRow = createInputRow(null, "number", "year", "year");
    const bio = makeElement("textarea", "bio", null, null) as HTMLTextAreaElement;
    bio.placeholder = "Bio...";
    bio.name = "bio";
    bio.id = "bio";
    const photoUpload = createInputRow("Photo:", "file", "Photo", "photoFile") as HTMLInputElement;
    photoUpload.accept = "image/*";
    modalContent.append(nameRow, yearRow, bio, photoUpload);

    const buttonRow = makeElement("div", null, "button-row", null);

    const closeModal = () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.removeChild(modalRoot);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            closeModal();
        }
    };

    const submitBtn = createButton("Add Child", "button", "submit-btn", "accent-button", "add") as HTMLButtonElement;
    submitBtn.onclick = async function () {
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        let success = await submitData(new FormData(modalContent));
        if (success) {
            closeModal();
            modalContent.reset();
            await updateSponsorshipSection();
        }
    }

    const cancelButton = createButton("Cancel", "button", "cancel-btn", "accent-button", "close") as HTMLButtonElement;
    cancelButton.onclick = function () {
        modalContent.reset();
        closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    buttonRow.append(cancelButton, submitBtn);

    modalContent.appendChild(buttonRow);
    modalOverlay.appendChild(modalContent);
    modalRoot.appendChild(modalOverlay);

    modalRoot.style.display = 'flex';
    document.body.appendChild(modalRoot);
}

if (loading) loading.remove();
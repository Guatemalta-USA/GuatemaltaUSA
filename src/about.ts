import { getUserRole } from "./firebase/authService";
import { auth } from "./firebase/firebase";
import { addProfile, deleteProfile, getAllProfiles, getProfilesByCountry, updateProfile } from "./firebase/firebaseService";
import { initializeApp } from "./main";
import type { Profile } from "./models";
import { deleteImage, resizeImage, uploadImage } from "./modules/imageService";
import { confirmDeleteModal, createButton, createMessage, makeElement, makePBLock } from "./modules/utils";

const loading = document.getElementById("loading");
const viewSection = document.getElementById('content-display') as HTMLElement;
const profilesSection = document.getElementById('profiles-section') as HTMLElement;
const modalRoot = document.getElementById('modal-root') as HTMLElement;
const adminControls = document.getElementById('admin-controls') as HTMLElement;
const addProfileForm = document.getElementById('add-profile-form') as HTMLFormElement;
const cancelButton = document.getElementById("close-modal");
let editingProfileId: string | null = null;
let isAdmin = false;
const countries: string[] = ["usa", "guatemala"];


async function handleSubmit() {
    const submitBtn = document.getElementById('save-profile') as HTMLButtonElement;
    const fileInput = document.getElementById('p-image') as HTMLInputElement;
    const file = fileInput.files?.[0];

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        const allProfiles = await getAllProfiles();
        const existingProfile = allProfiles.find(p => p.name === editingProfileId);

        let photoURL = "";

        if (file) {
            if (editingProfileId && existingProfile?.photoURL) {
                await deleteImage(existingProfile.photoURL);
            }

            const resizedBlob = await resizeImage(file, 800, 800);
            photoURL = await uploadImage(resizedBlob as File);
        } else if (editingProfileId && existingProfile) {
            photoURL = existingProfile.photoURL;
        }
        const selectElement = document.getElementById("country") as HTMLSelectElement;
        const profileData: Profile = {
            name: (document.getElementById('p-name') as HTMLInputElement).value,
            position: (document.getElementById('p-position') as HTMLInputElement).value,
            email: (document.getElementById('p-email') as HTMLInputElement).value,
            about: (document.getElementById('p-about') as HTMLTextAreaElement).value,
            country: selectElement.value,
            photoURL: photoURL
        };

        if (editingProfileId) {
            await updateProfile(editingProfileId, profileData);
            createMessage("Profile updated!", "main-message", "edit");
        } else {
            if (!file) {
                createMessage("Please select an image for a new profile", "main-message", "error");
                submitBtn.disabled = false;
                submitBtn.innerText = "Save Profile";
                return;
            }
            await addProfile(profileData);
            createMessage("Profile added!", "main-message", "check_circle");
        }

        modalRoot.classList.add("hide");
        modalRoot.style.display = 'none';
        addProfileForm.reset();
        editingProfileId = null;

        await loadProfiles();

    } catch (error) {
        console.error("Error in handleSubmit:", error);
        createMessage("An error occurred while saving the profile.", "main-message", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Profile";
    }
}

async function loadProfiles() {
    profilesSection.innerHTML = "";
    countries.forEach(async (country: string) => {
        let profilesForCountry: Profile[] = await getProfilesByCountry(country);
        if (profilesForCountry.length !== 0) {
            profilesSection.classList.add("blue-background");

            const profilesContainer = makeElement("div", null, "container", null);

            const titleText = country.charAt(0).toUpperCase() + country.slice(1);
            if (country === "usa") {
                const countryH2 = makeElement("h2", "", "", `Our USA Team`);
                profilesContainer.appendChild(countryH2);
            } else {
                const countryH2 = makeElement("h2", "", "", `Our ${titleText} Team`);
                profilesContainer.appendChild(countryH2);
            }


            const profilesDiv = profilesForCountry.reduce((acc: HTMLElement, currentProfile: Profile, index) => {
                const profileArticle = makeElement("article", null, "profile-card", null);
                if (index % 2 !== 0) profileArticle.classList.add("flex-reverse");
                const imgContainer = makeElement("div", null, "image-container", null);
                const profilePicture = document.createElement("img");
                profilePicture.src = currentProfile.photoURL;
                imgContainer.appendChild(profilePicture);
                profileArticle.appendChild(imgContainer);

                const detailsContainer = makeElement("div", null, "profile-info", null);
                const profileName = makeElement("h3", null, null, currentProfile.name);
                detailsContainer.appendChild(profileName);

                const about = makePBLock([
                    ["b", currentProfile.position],
                    ["br", ""],
                    ["span", currentProfile.about]
                ]);
                detailsContainer.appendChild(about);
                if (isAdmin) {
                    const actionsDiv = makeElement("div", null, "profile-actions", null);

                    const editBtn = createButton("Edit", "button", `edit-${index}`, "edit-btn", "edit");
                    editBtn.onclick = () => handleEdit(currentProfile);

                    const deleteBtn = createButton("Delete", "button", `del-${index}`, "delete-btn", "delete");
                    deleteBtn.onclick = async () => {
                        const confirmed = await confirmDeleteModal(`Delete ${currentProfile.name}'s profile?`, "Deleting this profile will also delete their photo. This action cannot be undone.");
                        if (confirmed) {
                            try {
                                if (currentProfile.photoURL) {
                                    await deleteImage(currentProfile.photoURL);
                                }
                                await deleteProfile(currentProfile.name);
                                await loadProfiles();
                                createMessage("Profile and image deleted successfully.", "main-message", "delete");
                            } catch (err) {
                                console.error("Delete failed:", err);
                                createMessage("Failed to fully delete the profile. Please try reloading the page", "main-message", "error");
                            }
                        }
                    };

                    actionsDiv.appendChild(editBtn);
                    actionsDiv.appendChild(deleteBtn);
                    detailsContainer.appendChild(actionsDiv);
                }

                profileArticle.appendChild(detailsContainer);
                acc.appendChild(profileArticle);
                return acc;
            }, document.createElement("div"));

            profilesDiv.setAttribute("id", "team-grid");
            profilesContainer.appendChild(profilesDiv);
            profilesSection.appendChild(profilesContainer);
        }
    });
}

function handleEdit(profile: Profile) {
    editingProfileId = profile.name || null;
    const nameInput = document.getElementById('p-name') as HTMLInputElement;
    nameInput.value = profile.name;
    (document.getElementById('p-position') as HTMLInputElement).value = profile.position;
    (document.getElementById('p-email') as HTMLInputElement).value = profile.email;
    (document.getElementById('p-about') as HTMLTextAreaElement).value = profile.about;
    (document.getElementById("country") as HTMLSelectElement).value = profile.country;
    nameInput.readOnly = true;
    nameInput.style.backgroundColor = "var(--table-even-row)";
    nameInput.style.cursor = "not-allowed";
    const submitBtn = document.getElementById('save-profile') as HTMLButtonElement;
    const modalTitle = modalRoot.querySelector('h2');

    if (modalTitle) modalTitle.innerText = `Editing: ${profile.name}`;
    submitBtn.innerText = "Update Profile";

    modalRoot.classList.remove("hide");
    modalRoot.style.display = 'flex';
}

await initializeApp('About Us', 'About Us', { type: 'page', pageName: 'About' });
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const role = await getUserRole(user.uid);
        isAdmin = (role === "admin");

        if (isAdmin) {
            const addBtn = createButton("Add new member", "button", "addNew", "accent-button", "add");
            addBtn.onclick = () => {
                modalRoot.classList.remove("hide");
                modalRoot.style.display = 'flex';
            };
            adminControls.appendChild(addBtn);
        }
    }
    await loadProfiles();
    addProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmit();
    })
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});
cancelButton?.addEventListener('click', () => {
    modalRoot.classList.add("hide");
    modalRoot.style.display = 'none';
    addProfileForm.reset();
});
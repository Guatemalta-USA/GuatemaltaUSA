import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";

const contentSection = document.getElementById("content") as HTMLElement;
const loading = document.getElementById("loading") as HTMLElement;

const aboutLink = document.getElementById("aboutLink") as HTMLElement;
const mailingLink = document.getElementById("mailingLink") as HTMLElement;

initializeApp("Home", "Home").then(async () => {
    aboutLink.addEventListener('click', () => navigateTo("/about"));
    mailingLink.addEventListener('click', () => navigateTo("/mailinglist"));
    loading.remove();
    contentSection.classList.remove("hide");
});
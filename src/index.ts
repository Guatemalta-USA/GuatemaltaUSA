import { initializeApp } from "./main";
// import { navigateTo } from "./modules/navigate";

const contentSection = document.getElementById("content") as HTMLElement;
const loading = document.getElementById("loading") as HTMLElement;

initializeApp("Home", "Home").then(async () => {

    loading.remove();
    contentSection.classList.remove("hide");
});
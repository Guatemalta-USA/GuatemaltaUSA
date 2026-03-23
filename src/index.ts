import { initializeApp } from "./main.js";

const loading = document.getElementById("loading");
const viewSection = document.getElementById('content-display') as HTMLElement;


initializeApp("Home", "Home", "Home_page").then(async () => {
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});
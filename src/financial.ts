import { initializeApp } from "./main.js";

const loading = document.getElementById("loading");
const viewSection = document.getElementById('content-display') as HTMLElement;


initializeApp("Home", "Financial transparency", { type: 'page', pageName: 'Financial Transparency' }).then(async () => {
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});
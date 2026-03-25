import { initializeApp } from "./main";

const loading = document.getElementById("loading");
const viewSection = document.getElementById('content-display') as HTMLElement;

initializeApp("About", "About", true).then(async () => {
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});


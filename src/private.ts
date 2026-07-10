import { initializeApp } from "./main.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

const viewSection = document.getElementById('content-display') as HTMLElement;


initializeApp("About Us", "Private Policy", { type: 'page', pageName: 'Private Policy' }).then(async () => {
    const loading = document.getElementById("loading");
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});
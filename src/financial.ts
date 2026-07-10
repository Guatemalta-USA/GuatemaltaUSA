import { initializeApp } from "./main.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

const loading = document.getElementById("loading");
const viewSection = document.getElementById('content-display') as HTMLElement;


initializeApp("About Us", "Financial transparency", { type: 'page', pageName: 'Financial Transparency' }).then(async () => {
    if (loading) loading.remove();
    viewSection.classList.remove("hide");
});
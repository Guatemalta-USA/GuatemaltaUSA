import { initializeApp } from "./main.js";
import { createGiveButterWidget } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';

initializeApp("Donate", "Donate").then(async () => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('id');
    const donateWidgetWrapper = document.getElementById("donate-wrapper") as HTMLElement;
    const widget = createGiveButterWidget(campaignId, "form");
    donateWidgetWrapper.appendChild(widget);
});
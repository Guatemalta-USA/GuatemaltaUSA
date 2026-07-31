import { initializeApp } from "./main.js";
import { createGiveButterWidget, makeElement } from "./modules/utils.js";
import './css/style.css';
import './css/grid.css';
import './css/form.css';
import './css/quill.css';
import type { ProjectInfo } from "./models.js";
import { getProjectLinkByFormId } from "./firebase/firebaseService.js";

initializeApp("Donate", "Donate").then(async () => {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('id');
    const projectTitleH2 = makeElement("h2", null, null, null);
    projectTitleH2.style.textAlign = "center";
    if (campaignId) {
        const project: ProjectInfo | null = await getProjectLinkByFormId(campaignId);
        if (project) {
            projectTitleH2.textContent = project["projectName"];
        } else {
            projectTitleH2.textContent = "General Donation";
        }
    }
    const donateWidgetWrapper = document.getElementById("donate-wrapper") as HTMLElement;
    const widget = createGiveButterWidget(campaignId, "form");
    donateWidgetWrapper.append(projectTitleH2, widget);
});
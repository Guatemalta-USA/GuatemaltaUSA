import { loadFooter, loadHeader } from "./modules/templates.js";
export async function initializeApp(partentPage, currentPage) {
    if (currentPage !== "") {
        //Set the page title
        document.title = `${currentPage} - Guatemalta USA`;
    }
    //Wait for the DOM to load
    await new Promise(resolve => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        }
        else {
            resolve();
        }
    });
    loadHeader();
    loadFooter();
}

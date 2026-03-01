import { ALL_APP_PATHS, AppPath, navigateTo } from "./modules/navigate.js";
import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";

export async function initializeApp(partentPage: string, currentPage: string) {
  if (currentPage !== "") {
    //Set the page title
    document.title = `${currentPage} - Guatemalta USA`;
  }
  //Wait for the DOM to load
  await new Promise<void>(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    } else {
      resolve();
    }
  });
  loadHeader();
  loadNav();
  loadFooter();
}
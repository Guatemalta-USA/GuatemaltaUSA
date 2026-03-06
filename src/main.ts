import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { createMessage } from "./modules/utils.js";
import { Message } from "./models.js";

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

  const storedMessageString = sessionStorage.getItem("message");
  if (storedMessageString) {
    const storedMessage: Message = JSON.parse(storedMessageString);
    createMessage(storedMessage['message'], storedMessage['messageContainer'], storedMessage['icon']);
    sessionStorage.removeItem("message");
  }
}
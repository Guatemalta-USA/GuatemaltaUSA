import { loadFooter, loadHeader, loadNav } from "./modules/templates.js";
import { createMessage } from "./modules/utils.js";
import { Message } from "./models.js";

let mobileNavToggle = document.getElementById("mobile-nav-toggle") as HTMLElement;
let nav: HTMLElement;

export async function initializeApp(partentPage: string, currentPage: string) {
  console.log(partentPage);
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
  nav = document.querySelector("nav") as HTMLElement;
  //Mobile Nav toggle
  mobileNavToggle.addEventListener("click", () => {
    //Toggle to class 'open' on nav's classList
    nav.classList.toggle("open");
    //Check if 'open' is in nav's classList
    const isOpen = nav.classList.contains("open");
    //Display proper icon in nav toggle button
    if (isOpen) {
      mobileNavToggle.innerText = "close";
    } else {
      mobileNavToggle.innerText = "menu";
    }
  });

  const storedMessageString = sessionStorage.getItem("message");
  if (storedMessageString) {
    const storedMessage: Message = JSON.parse(storedMessageString);
    createMessage(storedMessage['message'], storedMessage['messageContainer'], storedMessage['icon']);
    sessionStorage.removeItem("message");
  }
}
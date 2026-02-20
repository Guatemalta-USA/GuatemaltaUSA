import { navigateTo } from "./navigate.js";
import { createLink } from "./utils.js";
export function loadHeader() {
    const headerElement = document.querySelector("header");
    const logo = document.createElement("img");
    logo.setAttribute("src", "../../images/logo.png");
    logo.setAttribute("alt", "Guatemalta USA");
    headerElement.appendChild(logo);
    const nav = document.createElement("nav");
    const home = createLink("Home", "", false);
    home.addEventListener('click', () => navigateTo('/'));
    nav.appendChild(home);
    headerElement.appendChild(nav);
}
export function loadFooter() {
    const footerElement = document.querySelector("footer");
    const ul = document.createElement("ul");
    const guatemaltaOrgLi = document.createElement("li");
    const guatemaltaOrg = createLink("Guatemalta.org", "https://guatemalta.org/", true);
    guatemaltaOrgLi.appendChild(guatemaltaOrg);
    ul.appendChild(guatemaltaOrgLi);
    const instagram = createLink("Instagram", "https://www.instagram.com/guatemaltausa", true);
    ul.appendChild(instagram);
    footerElement.appendChild(ul);
}

import { navigateTo } from "./navigate.js";
import { createLink, createSocialLink, makeElement } from "./utils.js";
import { auth } from "../firebase/firebase.js";
import { signOutUser } from "../firebase/authService.js";

export function loadHeader() {
    const headerElement = document.querySelector("header") as HTMLElement;
    const logo: HTMLImageElement = document.createElement("img");
    logo.src = "https://raw.githubusercontent.com/Guatemalta-USA/GuatemaltaUSA/refs/heads/main/images/logo.png";
    logo.alt = "Guatemalta USA";
    logo.classList.add("logo");
    headerElement.appendChild(logo);
    const mission = makeElement("p", "mission", null, null);
    const italics = makeElement("i", null, null, "Building a bridge of hope to Guatemala through sustainable housing, clean water, and educational opportunities.");
    mission.appendChild(italics);
    headerElement.appendChild(mission);
}

export function loadNav(activeNavLink: string) {
    const nav = document.querySelector("nav") as HTMLElement;
    const home = createLink("Home", "", false);
    home.addEventListener('click', () => navigateTo('/'));
    if (activeNavLink == "Home") home.setAttribute("aria-current", "page");
    nav.appendChild(home);
    // const about = createLink("About", "", false);
    // about.addEventListener('click', () => navigateTo('/about'));
    // if (activeNavLink == "About") about.setAttribute("aria-current", "page");
    // nav.appendChild(about);
    const mailingList = createLink("Mailing List", "", false);
    mailingList.addEventListener('click', () => navigateTo('/mailinglist'));
    if (activeNavLink == "Mailing List") mailingList.setAttribute("aria-current", "page");
    nav.appendChild(mailingList);
    const logout = makeElement("a", "logout", "hide", "Log Out");
    logout.addEventListener('click', () => signOutUser());
    nav.appendChild(logout);
    auth.onAuthStateChanged((user) => {
        if (user) {
            logout.classList.remove("hide");
        }
    });
}

export function loadFooter() {
    const footerElement = document.querySelector("footer") as HTMLElement;
    const ul = document.createElement("ul");
    const guatemalta = createSocialLink("guatemalta", 20);
    if (guatemalta) ul.appendChild(guatemalta);
    const facebook = createSocialLink("facebook", 20);
    if (facebook) ul.appendChild(facebook);
    const instagram = createSocialLink("instagram", 20);
    if (instagram) ul.appendChild(instagram);
    footerElement.appendChild(ul);
    
}
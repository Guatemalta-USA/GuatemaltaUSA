import { signOutUser } from "../firebase/authService.js";
import { auth } from "../firebase/firebase.js";
import { navigateTo } from "./navigate.js";
import { createLink, makeElement } from "./utils.js";

export function loadHeader() {
    const headerElement = document.querySelector("header") as HTMLElement;
    const logo = document.createElement("img");
    logo.setAttribute("src", "https://raw.githubusercontent.com/Guatemalta-USA/GuatemaltaUSA/refs/heads/main/images/logo.png");
    logo.setAttribute("alt", "Guatemalta USA");
    headerElement.appendChild(logo);
    const mission = makeElement("p", "mission", null, null);
    const italics = makeElement("i", null, null, "Building a bridge of hope to Guatemala through sustainable housing, clean water, and educational opportunities.");
    mission.appendChild(italics);
    headerElement.appendChild(mission);
}

export function loadNav() {
    const nav = document.querySelector("nav") as HTMLElement;
    const home = createLink("Home", "", false);
    home.addEventListener('click', () => navigateTo('/'));
    nav.appendChild(home);
    // const about = createLink("About", "", false);
    // about.addEventListener('click', () => navigateTo('/about'))
    // nav.appendChild(about);
    const mailingList = createLink("Mailing List", "", false);
    mailingList.addEventListener('click', () => navigateTo('/mailing-list'));
    nav.appendChild(mailingList);
    // const donate = createLink("Donate", "#", false);
    // nav.appendChild(donate);
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
    const guatemaltaOrgLi = document.createElement("li");
    const guatemaltaOrg = createLink("Guatemalta.org","https://guatemalta.org/", true )
    guatemaltaOrgLi.appendChild(guatemaltaOrg);
    ul.appendChild(guatemaltaOrgLi);
    const instagram = createLink("Instagram", "https://www.instagram.com/guatemaltausa", true);
    ul.appendChild(instagram);
    const facebook = createLink("Facebook", "https://www.facebook.com/guatemalta.usa", true);
    ul.appendChild(facebook);

    footerElement.appendChild(ul);
    
}
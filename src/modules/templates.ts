import { navigateTo, type AppPath } from "./navigate.js";
import { createLink, createSocialLink, makeElement } from "./utils.js";
import { auth } from "../firebase/firebase.js";
import { signOutUser } from "../firebase/authService.js";

type NavItem = {
    label: string;
    path: AppPath;
};
//{ label: "About Us", path: "/about" },
const NAV_ITEMS: NavItem[] = [
    { label: "Home", path: "/" },
    { label: "Impact", path: "/impact/currentprojects" }, 
    { label: "Blog", path: "/blog" },
    { label: "Mailing List", path: "/mailinglist" },
] as const;

export function loadNav(activeNavLink: string) {
    const nav = document.querySelector("nav") as HTMLElement;
    if (!nav) return;
    auth.onAuthStateChanged(async (user) => {
        nav.innerHTML = "";
        NAV_ITEMS.forEach(({ label, path }) => {
            const link = createLink(label, "", false);
            link.addEventListener('click', () => navigateTo(path as any));
            if (activeNavLink === label) {
                link.setAttribute("aria-current", "page");
            }
            nav.appendChild(link);
        });
        if (user) {
            const logout = makeElement("a", "logout", "", "Log Out");
            logout.addEventListener('click', (e) => {
                e.preventDefault();
                signOutUser();
            });
            nav.appendChild(logout);
        }
    });
}

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

export function loadFooter() {
    const footerElement = document.querySelector("footer") as HTMLElement;
    const ul = document.createElement("ul");
    const guatemalta = createSocialLink("guatemalta", 20);
    if (guatemalta) ul.appendChild(guatemalta);
    const facebook = createSocialLink("facebook", 20);
    if (facebook) ul.appendChild(facebook);
    const instagram = createSocialLink("instagram", 20);
    if (instagram) ul.appendChild(instagram);
    const privatePolicy = document.createElement("a");
    privatePolicy.textContent = "Privacy Policy";
    privatePolicy.className = "link";
    privatePolicy.onclick = function() {
        navigateTo("/privatepolicy");
    }
    ul.appendChild(privatePolicy);
    footerElement.appendChild(ul);

}
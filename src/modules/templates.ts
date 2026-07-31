import { navigateTo, type AppPath } from "./navigate.js";
import { createLink, createSocialLink, donateListModal, makeElement } from "./utils.js";
import { auth } from "../firebase/firebase.js";
import { getUserRole, signOutUser } from "../firebase/authService.js";
import { getDonateButtonList } from "../firebase/firebaseService.js";

type SubNavItem = {
  label: string;
  path: AppPath;
  hash: string;
};

type NavItem = {
  label: string;
  path: AppPath | "donate";
  children?: SubNavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "Impact", path: "/impact/currentprojects" },
  { label: "Blog", path: "/blog" },
  {
    label: "About Us",
    path: "/about",
    children: [
      { label: "Our Story", path: "/about", hash: "#story" },
      { label: "Our Team", path: "/about", hash: "#team" },
      { label: "Contact Us", path: "/about", hash: "#contact" },
    ],
  },
  { label: "Mailing List", path: "/mailinglist" },
  { label: "Donate", path: "donate" },
];

let unsubscribeAuth: (() => void) | null = null;

export function loadNav(activeNavLink: string) {
  const nav = document.querySelector("nav") as HTMLElement;
  if (!nav) return;

  const closeMobileNav = () => {
    nav.classList.remove("mobile-open");
    const toggleBtn = document.getElementById("mobile-nav-toggle") as HTMLButtonElement;
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.textContent = "menu";
    }
  };

  const handleDonateClick = async (e: MouseEvent) => {
    e.preventDefault();
    closeMobileNav();

    try {
      const donateButtonLinks = await getDonateButtonList();

      if (!donateButtonLinks || donateButtonLinks.length === 0) {
        navigateTo("/donate" as any);
        return;
      }

      const selectedProject = await donateListModal(
        "Select a project to support",
        donateButtonLinks
      );

      if (selectedProject) {
        navigateTo(`/donate?id=${selectedProject.formId}` as any);
      }
    } catch (error) {
      console.error("Error opening donate list modal:", error);
    }
  };

  nav.innerHTML = "";

  NAV_ITEMS.forEach(({ label, path, children }) => {
    if (path === "donate") {
      const donateLink = createLink(label, "donate-nav-btn", false);
      donateLink.addEventListener("click", handleDonateClick);
      donateLink.classList.add("donate-button");

      if (activeNavLink === label) {
        donateLink.setAttribute("aria-current", "page");
      }

      nav.appendChild(donateLink);
    } else if (children && children.length > 0) {
      const dropdownContainer = document.createElement("div");
      dropdownContainer.className = "nav-dropdown-container";

      const dropdownHeader = document.createElement("div");
      dropdownHeader.className = "dropdown-header";

      const parentLink = createLink(label, "dropdown-toggle", false);
      parentLink.addEventListener("click", (e) => {
        e.preventDefault();
        closeMobileNav();
        navigateTo(path as any);
      });

      if (activeNavLink === label) {
        parentLink.setAttribute("aria-current", "page");
      }

      dropdownHeader.appendChild(parentLink);
      dropdownContainer.appendChild(dropdownHeader);

      const dropdownMenu = document.createElement("ul");
      dropdownMenu.className = "nav-dropdown-menu";

      children.forEach((subItem) => {
        const li = document.createElement("li");
        li.className = "nav-dropdown-item";

        const subLink = createLink(subItem.label, "", false);
        subLink.addEventListener("click", (e) => {
          e.preventDefault();
          closeMobileNav();
          navigateTo((subItem.path + subItem.hash) as any);
        });

        li.appendChild(subLink);
        dropdownMenu.appendChild(li);
      });

      dropdownContainer.appendChild(dropdownMenu);
      nav.appendChild(dropdownContainer);
    } else {
      const link = createLink(label, "", false);
      link.addEventListener("click", () => {
        closeMobileNav();
        navigateTo(path as any);
      });

      if (activeNavLink === label) {
        link.setAttribute("aria-current", "page");
      }
      nav.appendChild(link);
    }
  });

  const authLinksContainer = document.createElement("div");
  authLinksContainer.className = "auth-links";
  nav.appendChild(authLinksContainer);

  if (unsubscribeAuth) {
    unsubscribeAuth();
  }

  unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
    authLinksContainer.innerHTML = "";

    if (user) {
      const userRole = await getUserRole(user.uid);

      if (userRole === "admin") {
        const admin = makeElement("a", "admin", "", "Admin");
        admin.addEventListener("click", () => {
          closeMobileNav();
          navigateTo("/admin");
        });
        authLinksContainer.appendChild(admin);
      }

      const logout = makeElement("a", "logout", "", "Log Out");
      logout.addEventListener("click", (e) => {
        e.preventDefault();
        closeMobileNav();
        signOutUser();
      });
      authLinksContainer.appendChild(logout);
    }
  });
}

export function loadHeader() {
  const headerElement = document.querySelector("header") as HTMLElement;
  if (!headerElement) return;

  headerElement.innerHTML = "";

  const logo: HTMLImageElement = document.createElement("img");
  logo.src = "https://raw.githubusercontent.com/Guatemalta-USA/GuatemaltaUSA/refs/heads/main/images/logo.png";
  logo.alt = "Guatemalta USA";
  logo.classList.add("logo");
  logo.onclick = function () {
    navigateTo("/");
  };
  headerElement.appendChild(logo);

  const mission = makeElement("p", "mission", null, null);
  const italics = makeElement(
    "i",
    null,
    null,
    "Building a bridge of hope to Guatemala through sustainable housing, clean water, and educational opportunities."
  );
  mission.appendChild(italics);
  headerElement.appendChild(mission);

  const mobileNavToggleBtn = document.createElement("button") as HTMLButtonElement;
  mobileNavToggleBtn.id = "mobile-nav-toggle";
  mobileNavToggleBtn.classList.add("material-symbols-outlined");
  mobileNavToggleBtn.textContent = "menu";
  mobileNavToggleBtn.setAttribute("aria-label", "Toggle navigation");
  mobileNavToggleBtn.setAttribute("aria-expanded", "false");

  mobileNavToggleBtn.addEventListener("click", () => {
    const nav = document.querySelector("nav");
    if (!nav) return;

    const isOpen = nav.classList.toggle("mobile-open");
    mobileNavToggleBtn.setAttribute("aria-expanded", String(isOpen));
    mobileNavToggleBtn.textContent = isOpen ? "close" : "menu";
  });

  headerElement.appendChild(mobileNavToggleBtn);
}

export function loadFooter() {
  const footerElement = document.querySelector("footer") as HTMLElement;
  if (!footerElement) return;

  footerElement.innerHTML = "";

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
  privatePolicy.onclick = function () {
    navigateTo("/privatepolicy");
  };
  ul.appendChild(privatePolicy);

  const financial = document.createElement("a");
  financial.textContent = "Financial Transparency";
  financial.className = "link";
  financial.onclick = function () {
    navigateTo("/financialtransparency");
  };
  ul.appendChild(financial);
  footerElement.appendChild(ul);

  const footerLegal = makeElement("div", null, "footer-legal", null);
  const nameP = makeElement(
    "p",
    null,
    null,
    `©${new Date().getFullYear()} Guatemalta USA, INC. All rights reserved.`
  );
  const addressP = makeElement(
    "p",
    null,
    null,
    "18928 Rivers Edge Dr. E. Chagrin Falls, OH 44023"
  );
  const registeredP = makeElement(
    "p",
    null,
    null,
    "Registered 501(c)(3) Nonprofit Organization | EIN: 41-4897982"
  );
  footerLegal.append(nameP, addressP, registeredP);
  footerElement.appendChild(footerLegal);
}
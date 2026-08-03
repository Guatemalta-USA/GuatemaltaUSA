import { navigateTo, type AppPath } from "./navigate.js";
import { createLink, createSocialLink, donateListModal, makeElement } from "./utils.js";
import { auth } from "../firebase/firebase.js";
import { getUserRole, signOutUser } from "../firebase/authService.js";
import { getDonateButtonList } from "../firebase/firebaseService.js";
import i18n, { updateContent } from "./i18n.js";

type SubNavItem = {
  label: string;
  path: AppPath;
  hash: string;
  i18n: string;
};

type NavItem = {
  label: string;
  path: AppPath | "donate";
  i18n: string;
  children?: SubNavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/", i18n: "nav_home" },
  { label: "Impact", path: "/impact", i18n: "nav_impact" },
  { label: "Blog", path: "/blog", i18n: "nav_blog" },
  {
    label: "About Us",
    path: "/about",
    i18n: "nav_about",
    children: [
      { label: "Our Story", path: "/about", hash: "#story", i18n: "" },
      { label: "Our Team", path: "/about", hash: "#team", i18n: "" },
      { label: "Contact Us", path: "/about", hash: "#contact", i18n: "" },
    ],
  },
  { label: "Mailing List", path: "/mailinglist", i18n: "nav_mailing_list" },
  { label: "Donate", path: "donate", i18n: "nav_donate" },
];

let unsubscribeAuth: (() => void) | null = null;
let languageChangeListener: ((lng: string) => void) | null = null;

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
        i18n.t("select_project_support", "Select a project to support"),
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

  NAV_ITEMS.forEach((item) => {
    const { label, path, children, i18n: i18nKey } = item;

    if (path === "donate") {
      const donateLink = createLink(label, "donate-nav-btn", false);
      if (i18nKey) donateLink.setAttribute("data-i18n", i18nKey);
      
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
      if (i18nKey) parentLink.setAttribute("data-i18n", i18nKey);

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
        if (subItem.i18n) subLink.setAttribute("data-i18n", subItem.i18n);

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
      if (i18nKey) link.setAttribute("data-i18n", i18nKey);

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
        const admin = makeElement("a", "admin", "", "Admin", "nav_admin");
        admin.addEventListener("click", () => {
          closeMobileNav();
          navigateTo("/admin");
        });
        authLinksContainer.appendChild(admin);
      }

      const logout = makeElement("a", "logout", "nav-action", "Log Out", "nav_logout");
      logout.addEventListener("click", (e) => {
        e.preventDefault();
        closeMobileNav();
        signOutUser();
      });
      authLinksContainer.appendChild(logout);
      updateContent();
    }
  });

  const languageToggle = makeElement("a", "lang-toggle", "nav-action", null);
  
  const langIcon = makeElement("span", null, "material-symbols-outlined", "language");
  const langToggleText = makeElement("span", "lang-text", null, null) as HTMLSpanElement;

  const activeLang = i18n.resolvedLanguage || i18n.language || "en";
  langToggleText.textContent = activeLang.toUpperCase();

  languageToggle.append(langIcon, langToggleText);

  languageToggle.addEventListener("click", async (e: MouseEvent): Promise<void> => {
    e.preventDefault();
    closeMobileNav();
    const currentLang = i18n.resolvedLanguage || i18n.language || 'en';
    const targetLang = currentLang.startsWith('en') ? 'es' : 'en';
    await i18n.changeLanguage(targetLang);
  });

  if (languageChangeListener) {
    i18n.off('languageChanged', languageChangeListener);
  }

  languageChangeListener = (lng: string) => {
    langToggleText.textContent = lng.toUpperCase();
  };

  i18n.on('languageChanged', languageChangeListener);

  nav.appendChild(languageToggle);

  updateContent();
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
    "Building a bridge of hope to Guatemala through sustainable housing, clean water, and educational opportunities.",
    "header_mission"
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
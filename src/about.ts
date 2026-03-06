import { initializeApp } from "./main";
import { navigateTo } from "./modules/navigate";

initializeApp("About", "About").then(() => {
    const homeLink = document.getElementById("homeLink") as HTMLElement;

    homeLink.addEventListener('click', () => navigateTo("/"));
});


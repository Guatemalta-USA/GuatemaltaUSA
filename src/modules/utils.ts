export function createLink(linkText: string, url: string, external: boolean) {
    const newLink = document.createElement("a")
    newLink.textContent = linkText;
    if (url != "") {
        newLink.setAttribute("href", url);
    }
    if (external) {
        newLink.setAttribute("target", "_blank");
    }
    return newLink;
}


export function createLink(linkText, url, external) {
    const newLink = document.createElement("a");
    newLink.textContent = linkText;
    if (url != "") {
        newLink.setAttribute("href", url);
    }
    if (external) {
        newLink.setAttribute("target", "_blank");
    }
    return newLink;
}

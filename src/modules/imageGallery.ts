import { createButton, showLightbox } from "./utils.js";
import { makeElement } from "./utils.js";

export function displayGallery(imgPaths: string[]) {
    const pauseButton = document.getElementById("gallery-toggle") as HTMLElement;
    const imageContainer = makeElement("div", "gallery-container", null, null);
    const imageGroup1 = imgPaths.reduce((acc: HTMLElement, currImg: string) => {
        const nextImage = document.createElement("img");
        nextImage.src = currImg;
        nextImage.addEventListener("click", () => showLightbox(currImg));
        acc.appendChild(nextImage);
        return acc;
    }, makeElement("div", null, "image-group", null));
    imageContainer.appendChild(imageGroup1);
    const imageGroup2 = imgPaths.reduce((acc: HTMLElement, currImg: string) => {
        const nextImage = document.createElement("img");
        nextImage.src = currImg;
        nextImage.addEventListener("click", () => showLightbox(currImg));
        acc.appendChild(nextImage);
        return acc;
    }, makeElement("div", null, "image-group", null));
    imageContainer.appendChild(imageGroup2);
    return imageContainer;
}

export const setupControls = () => {
  const container = document.querySelector<HTMLDivElement>('#gallery-container');
  const toggleBtn = document.querySelector<HTMLButtonElement>('#gallery-toggle');

  if (!container || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const isPaused = container.style.animationPlayState === 'paused';

    if (isPaused) {
      container.style.animationPlayState = 'running';
      toggleBtn.textContent = 'pause';
    } else {
      container.style.animationPlayState = 'paused';
      toggleBtn.textContent = 'play_arrow';
    }
  });
};

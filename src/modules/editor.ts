import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { ALL_APP_PATHS } from './navigate';
import { getPageContents, updatePageContents } from '../firebase/firebaseService';
import imageCompression from 'browser-image-compression';
import { ImageResize } from 'quill-image-resize-module-ts';
import { createButton, createMessage, makeElement, promptModal } from './utils';
import { showLightbox } from './imageGallery';

// --- Quill Customizations & Types ---
interface BlotFormat {
    new(...args: any[]): any;
    create(value: any): HTMLElement;
    sanitize?(url: string): string;
}

if (!Quill.imports['modules/imageResize']) {
    Quill.register('modules/imageResize', ImageResize);
}

const ImageFormat = Quill.import('formats/image') as BlotFormat;

class StyledImage extends ImageFormat {
    static blotName = 'image';
    static tagName = 'IMG';

    static create(value: string) {
        const node = super.create(value) as HTMLImageElement;

        node.addEventListener('click', () => {
            const saveBtn = document.getElementById("save-btn");
            if (saveBtn) {
                console.log("Lightbox skipped: Image is in editor mode.");
                return;
            }
            showLightbox(node.src, node.alt);
        });

        return node;
    }

    static formats(domNode: HTMLElement) {
        return {
            style: domNode.getAttribute('style'),
            width: domNode.getAttribute('width'),
            height: domNode.getAttribute('height'),
            alt: domNode.getAttribute('alt'),
        };
    }

    format(name: string, value: string) {
        if (['style', 'width', 'height', 'alt'].includes(name)) {
            if (value) {
                this.domNode.setAttribute(name, value);
            } else {
                this.domNode.removeAttribute(name);
            }
        } else {
            super.format(name, value);
        }
    }
}

const Link = Quill.import('formats/link') as BlotFormat;

class ActionLink extends Link {
    static blotName = 'actionLink';
    static tagName = 'A';

    static create(value: string) {
        const node = super.create(value);
        node.setAttribute('class', 'action-link');
        node.setAttribute('href', value);
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
        return node;
    }

    static formats(node: HTMLElement) {
        return node.getAttribute('href');
    }
}

class StandardLink extends Link {
    static create(value: string) {
        const node = super.create(value);
        const isInternal = value.startsWith('/');
        const isMailto = value.startsWith('mailto:');

        if (isInternal) {
            node.setAttribute('target', '_self');
        } else if (isMailto) {
            node.removeAttribute('target');
            node.removeAttribute('rel');
        } else {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
        return node;
    }

    static formats(node: HTMLElement) {
        return node.getAttribute('href');
    }
}

const VideoFormat = Quill.import('formats/video') as BlotFormat;

class YouTubeVideo extends VideoFormat {
    static create(value: string) {
        const node = super.create(value);
        const url = this.sanitize ? this.sanitize(value) : value;
        node.setAttribute('src', url);
        node.setAttribute('frameborder', '0');
        node.setAttribute('allowfullscreen', 'true');
        node.setAttribute('style', 'width: 100%; aspect-ratio: 16/9;');
        return node;
    }

    static sanitize(url: string) {
        const youtubeMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})(?:\S+)?$/);
        if (youtubeMatch) {
            return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }
        return url;
    }
}

const BlockEmbed = Quill.import('blots/block/embed') as any;

class GivebutterWidgetBlot extends BlockEmbed {
    static blotName = 'givebutter';
    static tagName = 'BUTTON'; 

    static create(value: string) {
        const widgetId = value && value.trim() !== "" ? value.trim() : 'gRGya8';
        const node = createButton("Donate Now", "button", "", "action-link", "favorite");
        node.setAttribute('data-id', widgetId);
        
        const idTag = document.createElement('span');
        idTag.setAttribute('class', 'donate-id-tag');
        idTag.innerText = ` (${widgetId})`;
        node.appendChild(idTag);

        return node;
    }

    static value(node: HTMLElement) {
        return node.getAttribute('data-id');
    }
}

Quill.register(GivebutterWidgetBlot);
Quill.register(GivebutterWidgetBlot);
Quill.register('formats/video', YouTubeVideo, true);
Quill.register('formats/actionLink', ActionLink);
Quill.register('formats/link', StandardLink, true);
Quill.register('formats/image', StyledImage, true);

// --- Main Editor Class ---
export class TheEditor {
    public quill!: Quill;
    public currentPage: string | null = null;
    private deletedImageURLs: string[] = [];
    private deleteObserver: MutationObserver | null = null;
    private activeImageElement: HTMLImageElement | null = null;

    constructor() {
        const container = document.getElementById('editor-container');
        if (!container) {
            throw new Error(`Editor container with ID "#editor-container" was not found in the DOM.`);
        }

        this.quill = new Quill(container, {
            theme: 'snow',
            placeholder: 'Start writing your content...',
            modules: {
                table: true,
                toolbar: {
                    container: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['givebutter', 'action-link', 'link', { 'nav-link': ALL_APP_PATHS }, 'mailto'],
                        ['table', 'image', 'video'],
                        ['clean']
                    ],
                    handlers: {
                        'link': async () => {
                            const url = await promptModal("Enter URL", "url...", "Insert url", false);
                            if (url) this.quill.format('link', url);
                        },
                        'givebutter': async () => {
                            const range = this.quill.getSelection();
                            const widgetId = await promptModal(
                                "Enter Givebutter Widget ID",
                                "e.g., gRGya8",
                                "Insert Widget",
                                false
                            );

                            if (widgetId !== null) {
                                if (range) {
                                    this.quill.insertEmbed(range.index, 'givebutter', widgetId, Quill.sources.USER);
                                    this.quill.setSelection(range.index + 1);
                                } else {
                                    const length = this.quill.getLength();
                                    this.quill.insertEmbed(length, 'givebutter', widgetId, Quill.sources.USER);
                                }
                            }
                        },
                        'action-link': async () => {
                            const url = await promptModal("Enter Action URL", "url...", "Add Action Button", false);
                            if (url) this.quill.format('actionLink', url);
                        },
                        'nav-link': (value: string) => {
                            if (value) {
                                const range = this.quill.getSelection();
                                if (range && range.length > 0) {
                                    this.quill.format('link', value);
                                } else {
                                    const index = range ? range.index : 0;
                                    this.quill.insertText(index, value, 'link', value);
                                    this.quill.setSelection(index + value.length);
                                }
                            }
                        },
                        'image': () => {
                            this.selectLocalImage();
                        },
                        'video': async () => {
                            const range = this.quill.getSelection();
                            const url = await promptModal("Enter the URL of the video", "video url", "Insert Video", false);

                            if (url && url !== "") {
                                if (range) {
                                    this.quill.insertEmbed(range.index, 'video', url, Quill.sources.USER);
                                    this.quill.setSelection(range.index + 1);
                                } else {
                                    const length = this.quill.getLength();
                                    this.quill.insertEmbed(length, 'video', url, Quill.sources.USER);
                                }
                            }
                        },
                        'mailto': async () => {
                            const savedRange = this.quill.getSelection();
                            const savedIndex = savedRange ? savedRange.index : this.quill.getLength() - 1;
                            const savedLength = savedRange ? savedRange.length : 0;

                            const email = await promptModal("Enter Email Address", "example@domain.com", "Insert Email Link", false);

                            if (email && email.trim() !== "") {
                                const mailtoUrl = email.startsWith('mailto:') ? email.trim() : `mailto:${email.trim()}`;
                                this.quill.focus();

                                if (savedLength > 0) {
                                    this.quill.formatText(savedIndex, savedLength, 'link', mailtoUrl);
                                } else {
                                    this.quill.insertText(savedIndex, email, 'link', mailtoUrl);
                                    this.quill.setSelection(savedIndex + email.length);
                                }
                            }
                        },
                        'table': () => {
                            const tableModule = this.quill.getModule('table') as any;
                            if (tableModule) {
                                tableModule.insertTable(1, 2);
                            }
                        }
                    }
                }
            }
        });

        // Initialize Image Resize Module manually
        const ImageResizeModule = Quill.import('modules/imageResize') as any;
        (this.quill as any).theme.modules.imageResize = new ImageResizeModule(this.quill, {
            displaySize: true,
            modules: ['Resize', 'DisplaySize'],
            handleStyles: {
                backgroundColor: '#a855f7',
                border: 'none',
                color: 'white'
            }
        });

        this.quill.on('selection-change', (range) => {
            if (!range) return;
            setTimeout(() => {
                const overlay = document.querySelector('div[style*="border: 1px dashed"]');
                if (overlay && !document.getElementById('custom-image-toolbar')) {
                    this.injectCustomToolbar(overlay as HTMLElement);
                }
            }, 50);
        });

        this.setupToolbarUI();
        this.setupDeleteObserver();
        this.setupImageClickTracking();
    }

    private setupImageClickTracking() {
        this.quill.root.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
                this.activeImageElement = target as HTMLImageElement;
                target.classList.add('ql-active');
            } else {
                this.activeImageElement = null;
                document.querySelectorAll('.ql-editor img').forEach(img => img.classList.remove('ql-active'));
            }
        });
    }

    private injectCustomToolbar(parent: HTMLElement) {
        const toolbar = document.createElement('div');
        toolbar.id = 'custom-image-toolbar';
        toolbar.style.cssText = `
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            background: #1a1a1a;
            padding: 4px;
            border-radius: 4px;
            border: 1px solid #a855f7;
            z-index: 10002;
        `;

        const alignments = [
            { label: 'Left', style: 'float: left; margin: 0 1em 1em 0;', icon: 'M21 6H3M15 12H3M17 18H3' },
            { label: 'Center', style: 'display: block; margin: auto;', icon: 'M18 6H6M21 12H3M18 18H6' },
            { label: 'Right', style: 'float: right; margin: 0 0 1em 1em;', icon: 'M21 6H3M21 12H9M21 18H7' }
        ];

        alignments.forEach(align => {
            const btn = document.createElement('button');
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#a855f7" stroke-width="2"><path d="${align.icon}"/></svg>`;
            btn.style.cssText = "background: none; border: none; cursor: pointer; padding: 4px; display: flex;";

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                let img = document.querySelector('img.ql-active') as HTMLImageElement || this.activeImageElement;
                if (!img) {
                    const images = Array.from(document.querySelectorAll('.ql-editor img'));
                    img = images.find(i => i.classList.contains('ql-active')) as HTMLImageElement;
                }

                if (img) {
                    const blot = Quill.find(img);
                    if (blot && !('root' in blot)) {
                        const index = this.quill.getIndex(blot);
                        this.quill.formatText(index, 1, 'style', align.style);
                    }
                }
            };
            toolbar.appendChild(btn);
        });

        parent.appendChild(toolbar);
    }

    private setupToolbarUI() {
        const givebutterBtn = document.querySelector('.ql-givebutter');
        if (givebutterBtn) {
            givebutterBtn.setAttribute('data-title', "Insert Givebutter Widget");
            givebutterBtn.innerHTML = `
        <svg viewBox="0 0 18 18">
            <rect class="ql-stroke" height="14" width="14" x="2" y="2" rx="2" ry="2" stroke="#a855f7" fill="none" stroke-width="2"></rect>
            <path class="ql-fill" d="M6,7.5 A1.5,1.5 0 1,1 3,7.5 A1.5,1.5 0 1,1 6,7.5 Z" fill="#a855f7"></path>
            <line class="ql-stroke" x1="8" x2="14" y1="7" y2="7" stroke="#a855f7" stroke-width="2"></line>
            <line class="ql-stroke" x1="5" x2="13" y1="11" y2="11" stroke="#a855f7" stroke-width="2"></line>
        </svg>
    `;
        }

        const navPicker = document.querySelector('.ql-nav-link');
        if (navPicker) {
            navPicker.setAttribute('data-label', 'App Pages');
            navPicker.setAttribute("data-title", "Insert a link to an internal page");
        }

        const navItems = document.querySelectorAll('.ql-nav-link .ql-picker-item');
        navItems.forEach(item => {
            const val = item.getAttribute('data-value');
            if (val) item.textContent = val;
        });

        const externalLink = document.querySelector(".ql-link");
        if (externalLink) externalLink.setAttribute('data-title', "Insert an external link");

        const actionBtn = document.querySelector('.ql-action-link');
        if (actionBtn) {
            actionBtn.setAttribute('data-title', "Insert an action link");
            actionBtn.innerHTML = `<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="10" width="14" x="2" y="4" rx="2" ry="2"></rect><line class="ql-stroke" x1="7" x2="11" y1="9" y2="9"></line></svg>`;
        }

        const imageBtn = document.querySelector('.ql-image');
        if (imageBtn) {
            imageBtn.setAttribute("data-title", "Upload Image");
        }

        const videoBtn = document.querySelector(".ql-video");
        if (videoBtn) videoBtn.setAttribute("data-title", "Insert a Youtube video");

        const mailtoBtn = document.querySelector('.ql-mailto');
        if (mailtoBtn) {
            mailtoBtn.setAttribute('data-title', "Insert Email Link");
            mailtoBtn.innerHTML = `
            <svg viewBox="0 0 18 18">
                <polyline class="ql-stroke" points="2 4 9 11 16 4"></polyline>
                <rect class="ql-stroke" height="10" width="14" x="2" y="4" rx="1" ry="1"></rect>
            </svg>`;
        }

        const tableBtn = document.querySelector('.ql-table');
        if (tableBtn) {
            tableBtn.setAttribute('data-title', 'Insert 2-Column Block Layout');
            tableBtn.innerHTML = `
                <svg viewBox="0 0 18 18">
                    <rect class="ql-stroke" height="14" width="6" x="2" y="2" rx="1" ry="1"></rect>
                    <rect class="ql-stroke" height="14" width="6" x="10" y="2" rx="1" ry="1"></rect>
                </svg>`;
        }

        const cleanBtn = document.querySelector(".ql-clean");
        if (cleanBtn) cleanBtn.setAttribute("data-title", "Clear all formatting for selection");
    }

    private setupDeleteObserver() {
        let currentImages = new Set(this.getImagesFromEditor());
        this.deleteObserver = new MutationObserver(() => {
            const newImages = new Set(this.getImagesFromEditor());
            for (const url of currentImages) {
                if (!newImages.has(url)) {
                    if (url.includes('photos.guatemaltausa.org')) {
                        this.deletedImageURLs.push(url);
                    }
                }
            }
            currentImages = newImages;
        });
        this.deleteObserver.observe(this.quill.root, { childList: true, subtree: true });
    }

    private getImagesFromEditor(): string[] {
        const imgs = this.quill.root.querySelectorAll('img');
        return Array.from(imgs).map(img => img.src).filter(src => src.includes('guatemaltausa.org'));
    }

    private async selectLocalImage() {
        const savedRange = this.quill.getSelection();
        if (!savedRange) {
            createMessage("Please click inside the editor or a block column first.", "main-message", "error");
            return;
        }

        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg' };

            try {
                const compressedFile = await imageCompression(file, options);
                const response = await fetch('https://photo-upload.guatemaltausa.workers.dev', {
                    method: 'POST',
                    body: compressedFile,
                    headers: { 'Content-Type': 'image/jpeg' }
                });

                if (!response.ok) throw new Error(`Worker Error ${response.status}`);
                const data = await response.json();

                if (data.url) {
                    this.quill.insertEmbed(savedRange.index, 'image', data.url);
                    this.quill.setSelection(savedRange.index + 1);
                    createMessage("Image uploaded successfully!", "main-message", "check_circle");

                    const altText = await promptModal(
                        "Please provide a description for this image",
                        "Image Description...",
                        "Add Description",
                        true
                    );

                    if (altText && altText.trim() !== "") {
                        this.quill.formatText(savedRange.index, 1, 'alt', altText.trim());
                    }
                }
            } catch (error) {
                createMessage("Upload failed.", "main-message", "error");
            }
        };
    }

    public async prepareContentForSave(): Promise<any> {
        const delta = this.quill.getContents();
        const finalImages = new Set(this.getImagesFromEditor());
        const trueDeletions = this.deletedImageURLs.filter(url => !finalImages.has(url));

        if (trueDeletions.length > 0) {
            try {
                const deletePromises = trueDeletions.map(url => {
                    const filename = url.split('/').pop();
                    return fetch(`https://photo-upload.guatemaltausa.workers.dev?filename=${filename}`, { method: 'DELETE' });
                });
                await Promise.all(deletePromises);
            } catch (err) {
                console.error("R2 cleanup failed:", err);
            }
            this.deletedImageURLs = [];
        }
        return delta.ops;
    }

    async load(pageName: string): Promise<void> {
        this.currentPage = pageName;
        try {
            const data = await getPageContents(pageName);
            if (data && data.content) {
                this.quill.setContents(data.content);
            } else {
                this.quill.setContents([] as any);
            }
            const lastUpdatedDiv = document.getElementById("last-updated");
            if (lastUpdatedDiv && data?.lastUpdated) {
                lastUpdatedDiv.innerHTML = "";
                const date = data.lastUpdated.toDate();
                const lastUpdatedP = makeElement("p", null, null, `Last Updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
                lastUpdatedDiv.appendChild(lastUpdatedP);
            }
        } catch (err) {
            console.error("Failed to load page content:", err);
        }
    }

    async save(): Promise<void> {
        if (!this.currentPage) return;
        try {
            const cleanContent = await this.prepareContentForSave();
            await updatePageContents(this.currentPage, { content: cleanContent });
            createMessage("Changes saved!", "main-message", "check_circle");
        } catch (err) {
            createMessage("Error saving to database.", "main-message", "error");
        }
    }

    public async deleteAllImages(): Promise<void> {
        const images = this.getImagesFromEditor();
        if (images.length === 0) return;

        try {
            const deletePromises = images.map(url => {
                const filename = url.split('/').pop();
                return fetch(`https://photo-upload.guatemaltausa.workers.dev?filename=${filename}`, {
                    method: 'DELETE'
                });
            });

            await Promise.all(deletePromises);
            console.log(`${images.length} images cleaned up from R2.`);
        } catch (err) {
            console.error("Failed to clean up images from R2:", err);
        }
    }

    public destroy(): void {
        if (this.deleteObserver) {
            this.deleteObserver.disconnect();
            this.deleteObserver = null;
        }
        this.activeImageElement = null;
    }

    public getHTML(): string { return this.quill.root.innerHTML; }
    public setHTML(html: string): void { this.quill.root.innerHTML = html; }
}
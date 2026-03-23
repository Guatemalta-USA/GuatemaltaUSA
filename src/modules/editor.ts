import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { ALL_APP_PATHS } from './navigate';
import { getPageContents, updatePageContents } from '../firebase/firebaseService';
import imageCompression from 'browser-image-compression';
import { ImageResize } from 'quill-image-resize-module-ts';
import { createMessage } from './utils';

if (!Quill.imports['modules/imageResize']) {
    Quill.register('modules/imageResize', ImageResize);
}

const Link = Quill.import('formats/link');

class ActionLink extends (Link as any) {
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

class StandardLink extends (Link as any) {
    static create(value: string) {
        const node = super.create(value);
        const isInternal = value.startsWith('/');
        if (isInternal) {
            node.setAttribute('target', '_self');
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
const ImageFormat = Quill.import('formats/image');

class StyledImage extends (ImageFormat as any) {
    static formats(domNode: HTMLElement) {
        return domNode.getAttribute('style');
    }

    format(name: string, value: string) {
        if (name === 'style') {
            this.domNode.setAttribute('style', value);
        } else {
            super.format(name, value);
        }
    }
}

Quill.register(StyledImage, true);
Quill.register(ActionLink);
Quill.register(StandardLink, true);

export class TheEditor {
    public quill!: Quill;
    private deletedImageURLs: string[] = [];
    private currentPage: string | null = null;

    constructor() {
        const container = document.getElementById('editor-container');
        if (!container) {
            throw new Error(`Editor container with ID "#editor-container" was not found in the DOM.`);
        }

        this.quill = new Quill(container, {
            theme: 'snow',
            placeholder: 'Start writing your content...',
            modules: {
                toolbar: {
                    container: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link', 'action-link', { 'nav-link': ALL_APP_PATHS }],
                        ['image'],
                        ['clean']
                    ],
                    handlers: {
                        'link': () => {
                            const url = prompt('Enter URL (use /path for internal):');
                            if (url) this.quill.format('link', url);
                        },
                        'action-link': () => {
                            const url = prompt('Enter Action URL:');
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
                                }
                            }
                        },
                        'image': () => {
                            this.selectLocalImage();
                        },
                        imageResize: {
                            modules: ['Resize', 'DisplaySize', 'Toolbar'],
                            handleStyles: {
                                backgroundColor: '#a855f7',
                                border: 'none',
                                color: 'white'
                            }
                        }
                    }
                }
            }
        });
        if (!(this.quill as any).theme.modules.imageResize) {
            const ImageResizeModule = Quill.import('modules/imageResize') as new (quill: any, options: any) => any;

            (this.quill as any).theme.modules.imageResize = new ImageResizeModule(this.quill, {
                displaySize: true,
                modules: ['Resize', 'DisplaySize'],
                handleStyles: {
                    backgroundColor: '#a855f7',
                    border: 'none',
                    color: 'white'
                }
            });
        }
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
                let img = document.querySelector('img.ql-active') as HTMLImageElement;

                if (!img) {
                    const images = Array.from(document.querySelectorAll('.ql-editor img'));
                    img = images.find(i => i.classList.contains('ql-active')) as HTMLImageElement
                        || (window as any).lastClickedImg;
                }

                if (img) {
                    const blot = Quill.find(img) as any;
                    if (blot) {
                        const index = this.quill.getIndex(blot);
                        this.quill.formatText(index, 1, 'style', align.style);
                    }
                } else {
                    console.warn("No active image. Trying global fallback...");
                }
            };
            this.quill.root.addEventListener('mousedown', (e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'IMG') {
                    (window as any).lastClickedImg = target;
                    target.classList.add('ql-active');
                } else {
                    document.querySelectorAll('.ql-editor img').forEach(img => img.classList.remove('ql-active'));
                }
            });
            toolbar.appendChild(btn);
        });

        parent.appendChild(toolbar);
    }

    private setupToolbarUI() {
        const navPicker = document.querySelector('.ql-nav-link .ql-picker-label');
        if (navPicker) {
            navPicker.setAttribute('data-label', 'App Pages');
        }

        const navItems = document.querySelectorAll('.ql-nav-link .ql-picker-item');
        navItems.forEach(item => {
            const val = item.getAttribute('data-value');
            if (val) item.textContent = val;
        });

        const actionBtn = document.querySelector('.ql-action-link');
        if (actionBtn) {
            actionBtn.innerHTML = `
            <svg viewBox="0 0 18 18">
                <rect class="ql-stroke" height="10" width="14" x="2" y="4" rx="2" ry="2"></rect>
                <line class="ql-stroke" x1="7" x2="11" y1="9" y2="9"></line>
            </svg>
        `;
        }
        const imageBtn = document.querySelector('.ql-image');
        if (imageBtn) {
            imageBtn.setAttribute('title', 'Upload Image');
        }
    }

    async load(pageName: string): Promise<void> {
        this.currentPage = pageName;
        try {
            const data = await getPageContents(pageName);
            if (data && data.content) {
                this.quill.setContents(data.content);
            } else {
                this.quill.setContents([]);
            }
        } catch (err) {
            console.error("Failed to load page content:", err);
        }
    }

    async save(): Promise<void> {
        if (!this.currentPage) return;
        const delta = this.quill.getContents();

        try {
            await updatePageContents(this.currentPage, {
                content: delta.ops
            });
            const finalImagesInEditor = new Set(this.getImagesFromEditor());
            const trueDeletions = this.deletedImageURLs.filter(url => !finalImagesInEditor.has(url));

            if (trueDeletions.length > 0) {
                const deletePromises = trueDeletions.map(url => {
                    const filename = url.split('/').pop();
                    return fetch(`https://photo-upload.guatemaltausa.workers.dev?filename=${filename}`, {
                        method: 'DELETE'
                    });
                });
                await Promise.all(deletePromises);

                this.deletedImageURLs = [];
            }

            createMessage("Changes saved and storage cleaned!", "main-message", "check_circle");

        } catch (err) {
            console.error("Failed to save page content or cleanup storage:", err);
            createMessage("Error: Save failed.", "main-message", "error");
        }
    }

    public getHTML(): string {
        return this.quill.root.innerHTML;
    }

    public setHTML(html: string): void {
        this.quill.root.innerHTML = html;
    }

    private async selectLocalImage() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files![0];
            if (!file) return;

            const options = {
                maxSizeMB: 0.8,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
                fileType: 'image/jpeg'
            };

            try {
                // @ts-ignore
                const compressedFile = await imageCompression(file, options);
                const response = await fetch('https://photo-upload.guatemaltausa.workers.dev', {
                    method: 'POST',
                    body: compressedFile,
                    headers: { 'Content-Type': 'image/jpeg' }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Worker Error ${response.status}: ${errorText}`);
                }

                const text = await response.text();
                if (!text) throw new Error("Worker returned an empty response.");

                const data = JSON.parse(text);

                if (data.url) {
                    const range = this.quill.getSelection(true);
                    this.quill.insertEmbed(range.index, 'image', data.url);
                    this.quill.setSelection(range.index + 1);
                    createMessage("Image uploaded successfully!", "main-message", "check_circle")
                }
            } catch (error) {
                console.error("Compression Error:", error);
                createMessage("Error: Image is too large or invalid. Please try another.", "main-message", "error")
                throw new Error(`Image is too large or invalid. Please try another.`);
            }
        };
    }

    private setupDeleteObserver() {
        let currentImages = new Set(this.getImagesFromEditor());

        const observer = new MutationObserver(() => {
            const newImages = new Set(this.getImagesFromEditor());

            for (const url of currentImages) {
                if (!newImages.has(url)) {
                    // Check if it's one of our R2 images
                    if (url.includes('photos.guatemaltausa.org')) {
                        this.deletedImageURLs.push(url);
                        console.log("Added to deletion queue:", url);
                    }
                }
            }
            currentImages = newImages;
        });

        observer.observe(this.quill.root, { childList: true, subtree: true });
    }

    private getImagesFromEditor(): string[] {
        const imgs = this.quill.root.querySelectorAll('img');
        return Array.from(imgs).map(img => img.src).filter(src => src.includes('guatemaltausa.org'));
    }
}
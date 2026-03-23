import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { ALL_APP_PATHS } from './navigate';
import { getPageContents, updatePageContents } from '../firebase/firebaseService';

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

Quill.register(ActionLink);
Quill.register(StandardLink, true);

export class TheEditor {
    public quill!: Quill;
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
                        ['link', 'action-link'],
                        [{ 'nav-link': ALL_APP_PATHS }],
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
                        }
                    }
                }
            }
        });

        this.setupToolbarUI();
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
            // Replace 'Btn' with a clean SVG icon
            actionBtn.innerHTML = `
            <svg viewBox="0 0 18 18">
                <rect class="ql-stroke" height="10" width="14" x="2" y="4" rx="2" ry="2"></rect>
                <line class="ql-stroke" x1="7" x2="11" y1="9" y2="9"></line>
            </svg>
        `;
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
        } catch (err) {
            console.error("Failed to save page content:", err);
        }
    }

    public getHTML(): string {
        return this.quill.root.innerHTML;
    }

    public setHTML(html: string): void {
        this.quill.root.innerHTML = html;
    }
}
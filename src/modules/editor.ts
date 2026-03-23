import Quill from 'quill';
import { Delta } from 'quill';
import 'quill/dist/quill.snow.css';
import { getPageContents, updatePageContents } from '../firebase/firebaseService';

const Link = Quill.import('formats/link');

class ActionLink extends (Link as any) {
    static blotName = 'actionLink';
    static tagName = 'A';
    static className = 'action-link';
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

// Ensure it's registered
Quill.register(ActionLink);

export class TheEditor {
    private quill: Quill;
    private currentPage: string | null = null;

    constructor(selector: string, placeholder: string = 'Start writing...') {
        const container = document.querySelector(selector) as HTMLElement;

        if (!container) {
            throw new Error(`Element ${selector} not found.`);
        }

        this.quill = new Quill(container, {
            theme: 'snow',
            placeholder: placeholder,
            modules: {
                toolbar: {
                    container: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        ['action-link'],
                        ['clean']
                    ],
                    handlers: {
                        'action-link': () => {
                            const range = this.quill.getSelection();
                            const url = prompt('Enter the Action Link URL (e.g., https://google.com):');
                            if (!url) return;

                            if (range && range.length > 0) {
                                this.quill.format('actionLink', url);
                            } else {
                                const text = prompt('Enter the text to display for this link:');
                                if (text) {
                                    const index = range ? range.index : this.quill.getLength();
                                    this.quill.insertText(index, text, 'actionLink', url);
                                    this.quill.setSelection(index + text.length, 0);
                                }
                            }
                        }
                    }
                }
            }
        });

        const actionBtn = document.querySelector('.ql-action-link') as HTMLElement;
        if (actionBtn) {
            actionBtn.innerHTML = '⭐';
            actionBtn.title = "Add Action Link";
        }
    }

    async load(pageName: string): Promise<void> {
        this.currentPage = pageName;
        const data = await getPageContents(pageName);

        if (data && data.content) {
            this.quill.setContents(data.content);
        } else {
            this.quill.setContents(new Delta());
        }
    }

    async save(): Promise<void> {
        if (!this.currentPage) return;
        const delta = this.quill.getContents();
        const rawContent = delta.ops;

        await updatePageContents(this.currentPage, {
            content: rawContent
        });
    }

    public getHTML(): string {
        return this.quill.root.innerHTML;
    }

    public setHTML(html: string): void {
        this.quill.root.innerHTML = html;
    }
}
import { Timestamp } from "firebase/firestore";
import { marked } from "marked";

export class Message {
    public message: string;
    public messageContainer: string;
    public icon: string;
    constructor(
        message: string,
        messageContainer: string,
        icon: string
    ) {
        this.message = message;
        this.messageContainer = messageContainer;
        this.icon = icon;
    }
}

export class PageContents {
    public pageName: string;
    public markdown: string;
    public lastUpdated: Timestamp; 
    constructor(
        pageName: string,
        markdown: string,
        lastUpdated: Timestamp,
    ) {
        this.pageName = pageName;
        this.markdown = markdown;
        this.lastUpdated = lastUpdated;
    }

    async convertToHTML() {
        return await marked.parse(this.markdown)
    }
}
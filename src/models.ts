export class Message {
    public message: string;
    public messageContainer: string
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
import {MessageItem} from "../../../types/detachable";
import {getActualUserName} from "@/modules/users/user.module";

/**
 * Chat Manager
 * This class manages the chat container and messages
 */
class ChatManager {
    private container: HTMLElement;
    private messages: MessageItem[] = [];
    private displayedMessages: HTMLElement[] = [];
    private maxDisplayedMessages = 100; // Maximum number of messages displayed at once
    private cleanupInterval = 1000; // Cleanup interval in ms

    constructor(container: HTMLElement) {
        this.container = container;
        this.setupContainer();
        this.setupCleanupInterval();
    }

    /**
     * Setup the chat container
     */
    private setupContainer(): void {
        this.container.style.cssText = `
            position: relative;
            overflow-y: auto;
            height: calc(100vh - 50px);
            scroll-behavior: smooth;
        `;

        this.container.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                this.cleanupMessages();
            });
        });
    }

    /**
     * Setup the cleanup interval
     */
    private setupCleanupInterval(): void {
        setInterval(() => {
            this.cleanupMessages();
        }, this.cleanupInterval);
    }

    /**
     * Add a new message to the chat
     * @param message - The message to add
     */
    public addMessage(message: MessageItem): void {
        const index = this.findInsertPosition(message.timestamp);
        this.messages.splice(index, 0, message);

        const element = this.createMessageElement(message);

        const shouldScroll = this.isNearBottom();

        if (index === this.messages.length - 1) {
            this.container.appendChild(element);
        } else {
            const nextElement = this.displayedMessages[index];
            if (nextElement) {
                this.container.insertBefore(element, nextElement);
            } else {
                this.container.appendChild(element);
            }
        }

        this.displayedMessages.splice(index, 0, element);

        if (shouldScroll) {
            this.scrollToBottom();
        }

        this.cleanupMessages();
    }

    /**
     * Cleanup old messages
     */
    private cleanupMessages(): void {
        if (this.displayedMessages.length <= this.maxDisplayedMessages) {
            return;
        }

        const containerTop = this.container.scrollTop;
        const containerBottom = containerTop + this.container.clientHeight;
        const buffer = this.container.clientHeight; // Zone tampon

        while (this.displayedMessages.length > this.maxDisplayedMessages) {
            const element = this.displayedMessages[0];
            const rect = element.getBoundingClientRect();

            if (rect.bottom < containerTop - buffer) {
                element.remove();
                this.displayedMessages.shift();
            } else {
                break;
            }
        }

        while (this.displayedMessages.length > this.maxDisplayedMessages) {
            const element = this.displayedMessages[this.displayedMessages.length - 1];
            const rect = element.getBoundingClientRect();

            if (rect.top > containerBottom + buffer) {
                element.remove();
                this.displayedMessages.pop();
            } else {
                break;
            }
        }
    }

    /**
     * Find the index to insert a message based on its timestamp
     * @param timestamp - The timestamp of the message
     * @returns number - The index to insert the message
     */
    private findInsertPosition(timestamp: number): number {
        return this.messages.findIndex(item => item.timestamp > timestamp);
    }

    /**
     * Create a message element
     * @param message - The message to create the element for
     * @returns HTMLElement - The created message element
     */
    private createMessageElement(message: MessageItem): HTMLElement {
        const element = document.createElement('div');
        element.className = 'message ' + this.getMessageClasses(message);

        element.innerHTML = `
            <div class="message-header">
                <span class="sender">${message.sender}</span>
                <span class="time">${message.time}</span>
            </div>
            <div class="content">${message.content}</div>
        `;

        return element;
    }

    /**
     * Get the classes for a message
     * @param message - The message to get classes for
     * @returns string - The classes for the message
     */
    private getMessageClasses(message: MessageItem): string {
        return [
            message.isModerator ? 'moderator' : '',
            message.isSystem ? 'system' : '',
            message.isQuestion ? 'question' : '',
            message.isMention ? 'mention' : ''
        ].filter(Boolean).join(' ');
    }

    /**
     * Check if the chat is near the bottom
     * @returns boolean - true if near the bottom, false otherwise
     */
    public isNearBottom(): boolean {
        return (this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight) < 100;
    }

    /**
     * Scroll to the bottom of the chat
     * @param smooth - Whether to scroll smoothly or not
     */
    public scrollToBottom(smooth = true): void {
        this.container.scrollTo({
            top: this.container.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }
}

/**
 * Detachable Manager
 * This class manages the detached chat window
 */
export class DetachableManager {
    private chatWindow: Window | null = null;
    private processedMessageIds: Set<string> = new Set();
    private detachButton: HTMLButtonElement | null = null;
    private windowCheckInterval: number | null = null;

    setup() {
        this.cleanup();
        this.detachButton = this.createDetachButton();
        const header = document.querySelector('[data-test="chatTitle"]') as HTMLElement;
        if (!header) {
            return;
        }
        const container = header.querySelector('div.sc-gtLQVN.iySlus') as HTMLElement;

        container.style.display = 'flex';
        container.style.flexDirection = 'row-reverse';
        container.style.alignItems = 'center';

        container?.appendChild(this.detachButton);

        window.addEventListener('message', this.handleWindowMessage.bind(this));
        window.addEventListener('unload', () => this.cleanup());

        this.startWindowCheck();

        console.log('[Flowly] Detachable chat module initialized');
    }

    /**
     * Start the window check interval
     * @private
     */
    private startWindowCheck() {
        this.windowCheckInterval = window.setInterval(() => {
            if (this.chatWindow && this.chatWindow.closed) {
                this.cleanup();
            }
        }, 1000);
    }

    /**
     * Handles messages from the detached window
     * @param event
     * @private
     */
    private handleWindowMessage(event: MessageEvent) {
        if (event.data.type === 'WINDOW_CLOSED') {
            this.cleanup();
        }
    }

    /**
     * Check if the chat is detached
     * @returns boolean - true if the chat is detached, false otherwise
     */
    public isChatDetached(): boolean {
        return this.chatWindow !== null && !this.chatWindow?.closed;
    }

    /**
     * Create the detach button
     * @returns HTMLButtonElement - The created detach button
     */
    private createDetachButton(): HTMLButtonElement {

        const existingButton = document.getElementById('flowly-detach-button');
        if (existingButton) {
            existingButton.remove();
        }

        const button = document.createElement('button');
        button.className = 'sc-dJjYzT gbVgVx md buttonWrapper';
        button.id = 'flowly-detach-button';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        this.updateButtonState(button);
        button.onclick = () => this.toggleDetachedWindow();
        return button;
    }

    /**
     * Update the state of the detach button
     * @param button - The button to update
     */
    private updateButtonState(button: HTMLButtonElement) {
        const isDetached = Boolean(this.chatWindow);
        button.innerHTML = isDetached ? this.getCloseIcon() : this.getDetachIcon();
    }

    /**
     * Get the detach icon
     * @returns string - The detach icon SVG
     */
    private getDetachIcon(): string {
        return `
        <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 11L22 2M22 2H16.6562M22 2V7.34375" stroke="#4E5A66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="#4E5A66" stroke-width="2" stroke-linecap="round"/>
        </svg>
        `;
    }

    /**
     * Get the close icon
     * @returns string - The close icon SVG
     */
    private getCloseIcon(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none" stroke="#4E5A66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
        `;
    }

    /**
     * Toggle the detached window
     */
    private toggleDetachedWindow() {
        if (this.chatWindow) {
            this.cleanup();
        } else {
            this.detach();
        }
    }

    /**
     * Cleanup the detached window
     */
    cleanup() {
        if (this.windowCheckInterval) {
            clearInterval(this.windowCheckInterval);
            this.windowCheckInterval = null;
        }

        if (this.chatWindow && !this.chatWindow.closed) {
            this.chatWindow.close();
        }

        this.chatWindow = null;

        if (this.detachButton) {
            this.updateButtonState(this.detachButton);
        }
    }

    /**
     * Detach the chat
     */
    private async detach() {
        if (this.chatWindow) return;

        const html = this.generateDetachedHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        this.chatWindow = window.open(url, 'flowly_chat', 'width=400,height=600,resizable=yes');
        URL.revokeObjectURL(url);

        if (!this.chatWindow) {
            console.error('La fenêtre de chat n\'a pas pu être ouverte');
            return;
        }

        if (this.detachButton) {
            this.updateButtonState(this.detachButton);
        }
    }

    /**
     * Process a new message
     * @param messageElement - The message element to process
     */
    public processNewMessage(messageElement: HTMLElement): void {
        if (!this.chatWindow) return;

        const messageContainer = messageElement.closest('[data-test="msgListItem"]') as HTMLElement;
        if (!messageContainer) return;

        const messageId = this.generateMessageId(messageElement);
        if (this.processedMessageIds.has(messageId)) return;

        const messageData = this.extractMessageData(messageElement, messageContainer);
        this.chatWindow.postMessage({ type: 'NEW_MESSAGE', message: messageData }, '*');
        this.processedMessageIds.add(messageId);
    }

    /**
     * Generate a unique message ID based on the message content to prevent duplicates
     * @param messageElement - The message element to generate the ID for
     * @returns string - The generated message ID
     */
    private generateMessageId(messageElement: HTMLElement): string {
        const messageContainer = messageElement.closest('[data-test="msgListItem"]') as HTMLElement;
        const messageText = messageElement.textContent?.trim() || '';
        const sender = messageContainer?.querySelector('.sc-gFkHhu span')?.textContent?.trim() || '';
        const time = messageContainer?.querySelector('.sc-iElvnI')?.getAttribute('datetime') || '';
        return `${sender}-${time}-${messageText.substring(0, 50)}`;
    }

    /**
     * Extract message data from a message element
     * @param messageElement - The message element to extract data from
     * @param container - The message container element
     * @returns MessageItem - The extracted message data
     */
    private extractMessageData(messageElement: HTMLElement, container: HTMLElement) {
        const senderElement = container.querySelector('.sc-gFkHhu span');
        const timeElement = container.querySelector('.sc-iElvnI');
        const content = messageElement.innerHTML;
        const timestamp = this.parseTimestamp(timeElement?.textContent || '');
        const username = getActualUserName();

        return {
            id: this.generateMessageId(messageElement),
            sender: senderElement?.textContent || 'Système',
            time: timeElement?.textContent || new Date().toLocaleTimeString().slice(0, 5),
            timestamp,
            content,
            isModerator: container.classList.contains('moderator-message'),
            isSystem: Boolean(container.querySelector('[data-test="chatWelcomeMessageText"]')),
            isQuestion: content.includes('@question'),
            isMention: content.includes('@' + username)
        };
    }

    /**
     * Parse a time string to a timestamp
     * @param timeStr - The time string to parse
     * @returns number - The parsed timestamp
     */
    private parseTimestamp(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
    }

    /**
     * Generate the HTML for the detached chat window
     * @returns string - The generated HTML
     */
    private generateDetachedHTML(): string {
        return `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Tchat détaché - Fournis par Flowly by Théo Vilain</title>
                <style>
                    body { 
                        margin: 0;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        background: #f5f7f9;
                        line-height: 1.5;
                        color: #1a1a1a;
                        overflow: hidden;
                    }

                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        background: white;
                    }

                    .chat-header {
                        padding: 15px 20px;
                        background: white;
                        border-bottom: 1px solid #eaecef;
                        font-weight: 600;
                        color: #1a1a1a;
                        z-index: 10;
                        position: sticky;
                        top: 0;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    }

                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        position: relative;
                        overflow-anchor: none;
                    }

                    .message {
                        padding: 12px 16px;
                        background: #ffffff;
                        border-radius: 8px;
                        margin: 8px 16px;
                        border: 1px solid #eaecef;
                        transition: all 0.2s ease;
                        will-change: transform, opacity;
                    }

                    .message.moderator {
                        background: rgba(244, 67, 54, 0.05);
                        border-left: 4px solid #f44336;
                    }
                    
                    .message.system {
                        background: rgba(76, 175, 80, 0.05);
                        border-left: 4px solid #4caf50;
                    }

                    .message.mention {
                        background: rgba(25, 118, 210, 0.05);
                        border-left: 4px solid #1976d2;
                    }

                    .message.question {
                        background: rgba(255, 193, 7, 0.05);
                        border-left: 4px solid #ffc107;
                    }

                    .message-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }

                    .sender {
                        font-weight: 600;
                        color: #1a1a1a;
                        font-size: 0.95rem;
                    }

                    .time {
                        color: #6e7681;
                        font-size: 0.85rem;
                    }

                    .content {
                        color: #24292f;
                        line-height: 1.6;
                        font-size: 0.95rem;
                        word-break: break-word;
                    }

                    .content a {
                        color: #0969da;
                        text-decoration: none;
                    }

                    .content a:hover {
                        text-decoration: underline;
                    }

                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .message {
                        animation: fadeInUp 0.2s ease-out;
                    }

                    .chat-messages::-webkit-scrollbar {
                        width: 6px;
                    }

                    .chat-messages::-webkit-scrollbar-track {
                        background: #f5f7f9;
                    }

                    .chat-messages::-webkit-scrollbar-thumb {
                        background: #d0d7de;
                        border-radius: 3px;
                    }

                    .chat-messages::-webkit-scrollbar-thumb:hover {
                        background: #afb8c1;
                    }

                    @media (max-width: 768px) {
                        .message {
                            margin: 8px;
                            padding: 8px 12px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    <div class="chat-header">
                        <span>Discussion publique <span style="color: #888888; font-style: italic; font-size: 10px; font-weight: 400">(Lecture seule)</span></span>
                        <a href="https://flowlyweb.com/" target="_blank">
                            <img src="https://i.ibb.co/bK5N7CS/flowly-48.png" alt="Logo Flowly" style="float: right; height: 24px;">
                        </a>
                    </div>
                    <div class="chat-messages" id="messages"></div>
                </div>
                <script>
                    ${ChatManager.toString()}

                    const messages = document.getElementById('messages');
                    window.chatManager = new ChatManager(messages);
                    const processedMessageIds = new Set();

                    window.addEventListener('message', (event) => {
                        if (!event.source || event.source !== window.opener) return;
                    
                        if (event.data.type === 'NEW_MESSAGE') {
                            const msg = event.data.message;
                    
                            if (!processedMessageIds.has(msg.id)) {
                                const wasNearBottom = chatManager.isNearBottom();
                                chatManager.addMessage(msg);
                                processedMessageIds.add(msg.id);
                    
                                if (wasNearBottom) {
                                    chatManager.scrollToBottom();
                                }
                            }
                        }
                    });

                    window.addEventListener('beforeunload', () => {
                        window.opener?.postMessage({ type: 'WINDOW_CLOSED' }, '*');
                    });

                    window.addEventListener('focus', () => {
                        document.title = 'Discussion détachée - Fournie par Flowly par Théo Vilain';
                    });
                </script>
            </body>
            </html>
        `;
    }
}

export const detachableManager = new DetachableManager();
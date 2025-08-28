import { GifSelectorElement } from './gif-selector.element';
import { GifService } from '../../services/gif.service';

export class GifManager {
    private static instance: GifManager;
    private isEnabled: boolean = false;
    private currentSelector: GifSelectorElement | null = null;
    private gifService: GifService;

    private constructor() {
        this.gifService = GifService.getInstance();
    }

    public static getInstance(): GifManager {
        if (!GifManager.instance) {
            GifManager.instance = new GifManager();
        }
        return GifManager.instance;
    }

    public setup(): void {
        this.isEnabled = true;
        this.addGifButtonToInputArea();
        this.setupObserver();
        this.setupGifDetection();
        console.log('[Flowly] GIFs module initialized');
    }

    public cleanup(): void {
        this.isEnabled = false;
        this.removeGifButtons();
        this.closeSelector();
    }

    private setupObserver(): void {
        const observer = new MutationObserver((mutations) => {
            if (!this.isEnabled) return;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            // Check if the input area has been re-rendered
                            if (element.querySelector('#message-input') ||
                                element.id === 'message-input') {
                                this.addGifButtonToInputArea();
                            }
                            // Check for new chat messages to detect GIF links
                            if (element.classList.contains('sc-leYdVB') ||
                                element.querySelector('.sc-leYdVB')) {
                                this.detectGifLinks();
                            }
                        }
                    });
                }
            });
        });

        // Observe the entire document for changes to catch input area updates
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private addGifButtonToInputArea(): void {
        const messageInput = document.getElementById('message-input');

        if (!messageInput) {
            return;
        }

        const inputContainer = messageInput.parentElement;
        if (!inputContainer) {
            return;
        }

        // Check if GIF button already exists
        if (inputContainer.querySelector('.gif-input-button')) {
            return;
        }

        this.createGifInputButton(inputContainer);
    }

    private createGifInputButton(inputContainer: HTMLElement): void {
        const button = document.createElement('button');
        button.className = 'gif-input-button';
        button.innerHTML = `
            <div class="gif-button-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"/>
                </svg>
                <span class="gif-button-text">GIF</span>
            </div>
        `;
        button.title = 'Add GIF';
        button.setAttribute('aria-label', 'Add GIF');

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.showGifSelector(inputContainer);
        });

        // Style the button to fit with the input area
        button.style.cssText = `
            position: absolute;
            right: 50px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            z-index: 10;
        `;

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#f0f0f0';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'transparent';
        });

        // Position the input container as relative if needed
        if (getComputedStyle(inputContainer).position === 'static') {
            inputContainer.style.position = 'relative';
        }

        inputContainer.appendChild(button);
    }

    private showGifSelector(messageContainer: HTMLElement): void {
        // Close existing selector if open
        this.closeSelector();

        const onGifSelect = (gif: GifResult) => {
            this.insertGifIntoInput(gif);
            this.closeSelector();
        };

        const onClose = () => {
            this.closeSelector();
        };

        this.currentSelector = new GifSelectorElement(onGifSelect, onClose);

        // Position the selector
        this.positionSelector(messageContainer);

        // Add to DOM
        document.body.appendChild(this.currentSelector.getElement());
        this.currentSelector.show();
    }

    private positionSelector(messageContainer: HTMLElement): void {
        if (!this.currentSelector) return;

        const selectorElement = this.currentSelector.getElement();
        const containerRect = messageContainer.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const selectorWidth = 400;
        const selectorHeight = 500;

        let left = containerRect.left + containerRect.width + 10;
        let top = containerRect.top;

        // Adjust if selector goes off-screen
        if (left + selectorWidth > viewportWidth) {
            left = containerRect.left - selectorWidth - 10;
        }

        if (left < 0) {
            left = 10;
        }

        if (top + selectorHeight > viewportHeight) {
            top = viewportHeight - selectorHeight - 10;
        }

        if (top < 0) {
            top = 10;
        }

        selectorElement.style.left = `${left}px`;
        selectorElement.style.top = `${top}px`;
    }

    private insertGifIntoInput(gif: GifResult): void {
        const messageInput = document.getElementById('message-input') as HTMLInputElement;
        if (!messageInput) {
            return;
        }

        // Build the message text
        let messageText = '';
        
        // Add the attached text if provided
        if (gif.attachedText && gif.attachedText.trim()) {
            messageText = gif.attachedText.trim();
        }
        
        // Add the GIF URL
        const gifUrl = gif.url;
        messageText = messageText ? `${messageText} ${gifUrl}` : gifUrl;

        // Use the same method as mentions to properly trigger BBB's event system
        const currentValue = messageInput.value;
        const newText = currentValue + (currentValue ? ' ' : '') + messageText;

        // Select the input and use execCommand to insert text (like mentions do)
        messageInput.select();
        document.execCommand('insertText', false, newText);

        // Focus the input and set cursor at the end
        messageInput.focus();
        messageInput.setSelectionRange(newText.length, newText.length);
    }

    private setupGifDetection(): void {
        // Run initial detection on existing messages
        this.detectGifLinks();
    }

    private detectGifLinks(): void {
        const messageElements = document.querySelectorAll('[data-test="chatUserMessageText"]');

        messageElements.forEach(messageElement => {
            if (messageElement.hasAttribute('data-gif-processed')) {
                return; // Already processed
            }

            const messageText = messageElement.textContent;
            if (!messageText) return;

            // Check if message contains GIF URLs
            const gifUrlPattern = /https?:\/\/[^\s]+\.gif(\?[^\s]*)?/gi;
            const gifMatches = messageText.match(gifUrlPattern);

            if (gifMatches) {
                this.convertMessageToGifPreview(messageElement, gifMatches[0]);
                messageElement.setAttribute('data-gif-processed', 'true');
            }
        });
    }

    private convertMessageToGifPreview(messageElement: Element, gifUrl: string): void {
        const originalText = messageElement.textContent || '';
        
        // Extract text that isn't the GIF URL
        const textWithoutGif = originalText.replace(gifUrl, '').trim();

        // Create GIF preview element
        const gifPreview = document.createElement('div');
        gifPreview.className = 'gif-message-preview';
        
        // Include text if there's any
        let previewHTML = '';
        if (textWithoutGif) {
            previewHTML += `<div class="gif-message-text">${textWithoutGif}</div>`;
        }
        previewHTML += `<img src="${gifUrl}" alt="GIF" class="gif-message-image" loading="lazy">`;
        
        gifPreview.innerHTML = previewHTML;

        // Style the preview
        gifPreview.style.cssText = `
            margin: 8px 0;
            border-radius: 8px;
            overflow: hidden;
            max-width: 300px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            background: white;
        `;

        // Style the text if present
        const textDiv = gifPreview.querySelector('.gif-message-text') as HTMLElement;
        if (textDiv) {
            textDiv.style.cssText = `
                padding: 12px;
                background: #f8f9fa;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
                word-wrap: break-word;
            `;
        }

        const gifImage = gifPreview.querySelector('.gif-message-image') as HTMLImageElement;
        if (gifImage) {
            gifImage.style.cssText = `
                width: 100%;
                height: auto;
                display: block;
                max-height: 200px;
                object-fit: cover;
                ${textWithoutGif ? '' : 'border-radius: 8px;'}
            `;
        }

        // Replace the original message text with the GIF preview
        messageElement.innerHTML = '';
        messageElement.appendChild(gifPreview);

        // Trigger height recalculation after image loads
        const loadedGifImage = gifPreview.querySelector('.gif-message-image') as HTMLImageElement;
        if (loadedGifImage) {
            loadedGifImage.addEventListener('load', () => {
                this.recalculateMessageHeight(messageElement);
            });
            // Also handle error cases
            loadedGifImage.addEventListener('error', () => {
                // Silently handle error - image failed to load
            });
        }
    }


    private recalculateMessageHeight(messageElement: Element): void {
        try {
            // Find the message container
            const messageContainer = messageElement.closest('.sc-leYdVB');
            if (!messageContainer) {
                return;
            }

            // Find the chat container
            const chatContainer = document.querySelector('[data-test="chatMessages"]');
            if (!chatContainer) {
                return;
            }

            // Trigger a layout recalculation by forcing a reflow
            const currentHeight = messageContainer.scrollHeight;

            // Dispatch a resize event to notify BBB of the change
            window.dispatchEvent(new Event('resize'));

            // Also trigger a scroll event to ensure proper layout
            chatContainer.scrollTop = chatContainer.scrollTop;

            // If the user is near the bottom, scroll to maintain position
            const isNearBottom = (chatContainer.scrollTop + chatContainer.clientHeight) >= (chatContainer.scrollHeight - 50);
            if (isNearBottom) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        } catch (error) {
            // Silently handle errors
        }
    }

    private closeSelector(): void {
        if (this.currentSelector) {
            this.currentSelector.destroy();
            this.currentSelector = null;
        }
    }


    private removeGifButtons(): void {
        const buttons = document.querySelectorAll('.gif-input-button');
        buttons.forEach(button => button.remove());
    }
}

// Export singleton instance
export const gifManager = GifManager.getInstance();
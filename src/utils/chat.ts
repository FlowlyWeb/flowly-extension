/**
 * This function will force a reflow of the chat messages by recalculating the position of each drawn message from the modified message to the top to avoid overlapping.
 * @param messageContainer
 */
export function forceReflow(messageContainer?: HTMLElement) {
    if (!messageContainer) return;

    // 1. Get parent span of the modified message
    const modifiedSpan = messageContainer.closest<HTMLElement>('[role="listitem"]');
    if (!modifiedSpan) return;

    // 2. Update the height of the modified message because it's not updated automatically
    const innerDiv = modifiedSpan.querySelector<HTMLElement>('.sc-leYdVB');
    if (innerDiv) {
        modifiedSpan.style.height = `${innerDiv.offsetHeight}px`;
    }

    // 3. Get all messages
    const chatContainer = document.querySelector('[data-test="chatMessages"]');
    if (!chatContainer) return;

    const allMessages = Array.from(chatContainer.querySelectorAll<HTMLElement>('[role="listitem"]'));
    const modifiedIndex = allMessages.indexOf(modifiedSpan);

    // 4. Update the position of each message from the modified message to the top
    for (let i = modifiedIndex - 1; i >= 0; i--) {
        const messageSpan = allMessages[i];
        const newTop = parseFloat(allMessages[i + 1].style.top) - messageSpan.offsetHeight;
        messageSpan.style.top = `${newTop}px`;
    }
}
export function forceReflow(messageContainer?: HTMLElement) {
    if (!messageContainer) return;

    const modifiedSpan = messageContainer.closest<HTMLElement>('[role="listitem"]');
    if (!modifiedSpan) return;

    const innerDiv = modifiedSpan.querySelector<HTMLElement>('.sc-leYdVB');
    if (innerDiv) {

        const oldHeight = parseInt(modifiedSpan.style.height);
        const newHeight = innerDiv.offsetHeight;
        const heightDifference = newHeight - oldHeight;

        modifiedSpan.style.height = `${newHeight}px`;

        const currentTop = parseInt(modifiedSpan.style.top);
        modifiedSpan.style.top = `${currentTop - heightDifference}px`;
    }

    const chatContainer = document.querySelector('[data-test="chatMessages"]');
    if (!chatContainer) return;

    const allMessages = Array.from(chatContainer.querySelectorAll<HTMLElement>('[role="listitem"]'));
    const modifiedIndex = allMessages.indexOf(modifiedSpan);

    for (let i = modifiedIndex - 1; i >= 0; i--) {
        const messageSpan = allMessages[i];
        const messageBelow = allMessages[i + 1];

        const newTop = parseInt(messageBelow.style.top) - messageSpan.offsetHeight;
        messageSpan.style.top = `${newTop}px`;
    }
}
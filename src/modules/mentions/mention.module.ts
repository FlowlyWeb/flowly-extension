export function addClassMention(message: HTMLElement) {
    // Add special styling class
    const messageContainer = message.closest('.sc-leYdVB');
    messageContainer && !messageContainer.classList.contains('mention-highlight') && messageContainer.classList.add('mention-highlight');
}
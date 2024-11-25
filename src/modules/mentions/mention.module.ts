import { getActualUserName } from "../users/user.module";

export function addClassMention(message: HTMLElement) {
    // Add special styling class
    const messageContainer = message.closest('.sc-leYdVB');
    messageContainer && !messageContainer.classList.contains('mention-highlight') && messageContainer.classList.add('mention-highlight');
}

export function checkForMentions(message: HTMLElement, textContent: string | null) {
    const actualUserName = getActualUserName();
    if (textContent?.includes(`@${actualUserName}`)) {
        addClassMention(message);
    }
}
import { getActualUserName } from "../users/user.module";

export function addClassMention(message: HTMLElement) {

    const messageContainer = message.closest('.sc-leYdVB');
    if (!messageContainer) {
        return;
    }
    const parent = messageContainer.closest('[role="listitem"]') as HTMLElement;


    if (parent && !parent.classList.contains('moderator-message') && !parent.classList.contains('question-highlight')) {
        !parent.classList.contains('mention-highlight') && parent.classList.add('mention-highlight');
    }
}

export function checkForMentions(message: HTMLElement, textContent: string | null) {
    const actualUserName = getActualUserName();

    if (textContent?.includes(`@${actualUserName}`)) {
        addClassMention(message);
    }
}
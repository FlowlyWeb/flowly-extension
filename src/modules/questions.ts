export function addClassQuestion(message: HTMLElement) {
    const messageContainer = message.closest('.sc-leYdVB');
    // Add highlight class if not already present
    messageContainer 
    && !messageContainer.classList.contains('question-highlight') 
    && messageContainer.classList.add('question-highlight');

}
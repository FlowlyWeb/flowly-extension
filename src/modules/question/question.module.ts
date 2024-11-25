export function addClassQuestion(message: HTMLElement) {
  const messageContainer = message.closest('.sc-leYdVB');
  // Add highlight class if not already present
  messageContainer
  && !messageContainer.classList.contains('question-highlight')
  && messageContainer.classList.add('question-highlight');
}

export function checkForQuestions(message: HTMLElement, textContent: string | null) {
  if (textContent?.includes('@question')) {
    addClassQuestion(message);
  }
}
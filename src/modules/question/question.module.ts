export function addClassQuestion(message: HTMLElement) {

  const messageContainer = message.closest('.sc-leYdVB');
  if (!messageContainer) {
    return;
  }
  const parent = messageContainer.closest('[role="listitem"]') as HTMLElement;

  parent
  && !parent.classList.contains('question-highlight')
  && parent.classList.add('question-highlight');
}

export function checkForQuestions(message: HTMLElement, textContent: string | null) {
  if (textContent?.includes('@question')) {
    addClassQuestion(message);
  }
}
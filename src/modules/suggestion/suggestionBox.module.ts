import { getCachedUsers } from "../users/user.module";
import suggestionBoxElem from "./suggestionBox.element";

/**
 * Hide the suggestion box
 */
export function hideSuggestions(): void {
  if (suggestionBoxElem) {
      suggestionBoxElem.style.display = 'none';
  }
}

/**
 * Select a suggestion item
 * @param {HTMLElement} suggestionItem The suggestion item element
 * @param {HTMLInputElement} input The input element
 */
export function selectSuggestion(suggestionItem: HTMLElement, input: HTMLInputElement): void {

    const atIndex = input.value.lastIndexOf('@');

    if (atIndex === -1) return;

    const textBeforeAt = atIndex > 0 ? input.value.slice(0, atIndex) : '';

    const textAfterQuery = input.value.substring(atIndex).match(/(@\S*)(.*)/);
    const remainingText = textAfterQuery ? textAfterQuery[2] : '';

    const newText = textBeforeAt + '@' + (suggestionItem.textContent || '') + remainingText;

    input.select();
    document.execCommand('insertText', false, newText);

    const newCursorPosition = textBeforeAt.length + '@'.length + (suggestionItem.textContent?.length || 0);
    input.setSelectionRange(newCursorPosition, newCursorPosition);

    hideSuggestions();
}

/**
 * Search users and display suggestions
 * @param {string} query Search query
 * @param {HTMLInputElement} input Input element
 * @param {number} atIndex Position of @
 */
export function searchAndShowSuggestions(query: string, input: HTMLElement, atIndex: number) {

  const users = getCachedUsers();
  const suggestions = users.filter(user => user.name.toLowerCase().includes(query.toLowerCase()));

  // Simple check to see if the suggestion box exists, but it's impossible to not have it
  if (!suggestionBoxElem) return;

  // Clear existing suggestions
  suggestionBoxElem.innerHTML = '';

  for (const user of suggestions) {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'mention-suggestion-item';
      suggestionItem.textContent = user.name;
      suggestionBoxElem.appendChild(suggestionItem);
  }

    // Get the height of the suggestion box
    const suggestionsHeight = suggestionBoxElem.offsetHeight;

  // Position the suggestion box
  const rect = input.getBoundingClientRect();
  suggestionBoxElem.style.left = `${rect.left}px`;
  suggestionBoxElem.style.top = `${rect.top - suggestionsHeight}px`;
  suggestionBoxElem.style.width = `${rect.width}px`;
  suggestionBoxElem.style.display = 'block';
}
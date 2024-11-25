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
  input.value = suggestionItem.textContent || '';
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
  // Clear existing suggestions
  suggestionBoxElem.innerHTML = '';
  // Add new suggestions
  for (const user of suggestions) {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'mention-suggestion-item';
      suggestionItem.textContent = user.name;
      suggestionBoxElem.appendChild(suggestionItem);
  }

  // Position the suggestion box
  const rect = input.getBoundingClientRect();
  suggestionBoxElem.style.left = `${rect.left}px`;
  suggestionBoxElem.style.top = `${rect.bottom}px`;
  suggestionBoxElem.style.display = 'block';
}
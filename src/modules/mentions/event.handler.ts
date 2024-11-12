import suggestionBoxElem from "../suggestion/suggestionbox.element";
import { hideSuggestions, searchAndShowSuggestions, selectSuggestion } from "../suggestion/suggestionBox.module";

/**
 * Handle keydown events on the input field
 * @param {KeyboardEvent} e Keydown event
 */
export function handleKeyDownGlobal(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
      hideSuggestions();
  }
}

/**
 * Handle input changes and trigger suggestions display
 * @param {Event} e Input event
 */
export function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;

  if (target.id !== 'message-input') return;

  const text = target.value;
  const cursorPosition = target.selectionStart ?? 0;
  const textUpToCursor = text.slice(0, cursorPosition);
  const lastAtIndex = textUpToCursor.lastIndexOf('@');

  if (lastAtIndex === -1) {
      hideSuggestions();
      return;
  }

  const textAfterAt = textUpToCursor.slice(lastAtIndex + 1);
  if (textAfterAt.includes(' ')) {
      hideSuggestions();
      return;
  }

  // Show all suggestions if just after @
  if (lastAtIndex === cursorPosition - 1) {
      searchAndShowSuggestions('', target, lastAtIndex);
      return;
  }

  searchAndShowSuggestions(textAfterAt, target, lastAtIndex);
}


/**
 * Handle click events on suggestion items
 * @param {MouseEvent} e Click event
 */
export function handleGlobalClick(e: MouseEvent) {
  if (suggestionBoxElem) {
      const target = e.target as HTMLElement;

      const suggestionItem = target.closest('.mention-suggestion-item');
      if (suggestionItem) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          selectSuggestion(suggestionItem as HTMLElement, target as HTMLInputElement);
      } else if (!suggestionBoxElem.contains(target) && target.id !== 'message-input') {
          hideSuggestions();
      }
      
  }
}
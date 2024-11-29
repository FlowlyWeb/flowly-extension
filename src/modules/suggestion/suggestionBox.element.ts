let suggestionBoxElem: HTMLElement | null = document.querySelector('#mention-suggestions');

// Check if the suggestion box element already exists to avoid creating it multiple times
if (!suggestionBoxElem) {
    suggestionBoxElem = document.createElement('div');
    suggestionBoxElem.id = 'mention-suggestions';
    suggestionBoxElem.classList.add('mention-suggestions');

    document.body.appendChild(suggestionBoxElem);
}

export default suggestionBoxElem;
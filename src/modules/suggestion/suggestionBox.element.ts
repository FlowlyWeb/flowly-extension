let suggestionBoxElem: HTMLElement | null = document.querySelector('#mention-suggestions');

if (!suggestionBoxElem) {
    suggestionBoxElem = document.createElement('div');
    suggestionBoxElem.id = 'mention-suggestions';
    suggestionBoxElem.classList.add('mention-suggestions');

    document.body.appendChild(suggestionBoxElem);
}

export default suggestionBoxElem;
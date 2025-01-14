const createElement = (tag: string, options: { 
    classes?: string[], 
    dataset?: {[key: string]: string},
    attrs?: {[key: string]: string},
    text?: string
}) => {
    const element = document.createElement(tag);
    if (options.classes) element.classList.add(...options.classes);
    if (options.dataset) Object.assign(element.dataset, options.dataset);
    if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => 
        element.setAttribute(key, value));
    if (options.text) element.textContent = options.text;
    return element;
};

export function createMenuAdvancedQuestion() {
    const search = document.querySelector('.menu-advanced-question');
    if( search ) return;
    const menu = createElement('div', { classes: ['menu-advanced-question', 'kSvGlm'] });
    const titleElem = createElement('div', { classes: ['jzrScc', 'title-advanced-question'] });
    const h2Elem = createElement('h2', {
        classes: ['dImjuB', 'advanced-question-title'],
        dataset: { test: 'AdvancedQuestionTitle' },
        text: 'Advanced Question'
    });
    
    const subtitle = createElement('div', { 
        classes: ['ddUorp', 'erPTgh', 'subtitle-advanced-question'] 
    });
    const divNoName = createElement('div', { classes: ['dWegQI'] });
    const divArialabel = createElement('div', {
        classes: ['dalGph', 'fDCQFv'],
        attrs: {
            role: 'button',
            tabindex: '0',
            'aria-label': 'Listes des Questions',
            'aria-describedby': 'listQuestions'
        }
    });

    const iConElem = createElement('i', { classes: ['icon-bbb-help'] });
    const divAriaHidden = createElement('div', { attrs: { 'aria-hidden': 'true' } });
    const divDataTest = createElement('div', {
        classes: ['MsZNn'],
        dataset: { test: 'listQuestions' },
        text: 'Liste des Questions'
    });

    titleElem.appendChild(h2Elem);
    divAriaHidden.appendChild(divDataTest);
    divArialabel.append(iConElem, divAriaHidden);
    divNoName.appendChild(divArialabel);
    subtitle.appendChild(divNoName);
    menu.append(titleElem, subtitle);

    const noteSharedElem = document.querySelector('.sc-btlaCd') as HTMLElement;
    noteSharedElem.insertAdjacentElement('afterend', menu);
}
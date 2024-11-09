// Global variables for mentions system
let suggestionsBox = null;
let currentInput = null;
let cachedUsers = null;
let lastCacheTime = 0;
const CACHE_DURATION = 3000;

// Global click handler to close suggestions box when clicking outside
document.addEventListener('click', (e) => {
    if (suggestionsBox) {
        const isClickInside = suggestionsBox.contains(e.target) || e.target.id === 'message-input';
        if (!isClickInside) {
            hideSuggestions();
        }
    }
});

/**
 * Initialize the mentions system by setting up event listeners
 */
function setupMentions() {
    console.log('[WWSNB] Initializing user mentions module');

    // Remove any existing event listeners to prevent duplicates
    document.removeEventListener('input', handleInput);
    document.removeEventListener('keydown', handleKeyDownGlobal);

    // Add event listeners for handling mentions
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDownGlobal, true);
    document.addEventListener('click', handleGlobalClick, true);

    setupInputListener();
}

/**
 * Set up the input field listener and handle form submission
 */
function setupInputListener() {
    const chatInput = document.getElementById('message-input');
    currentInput = chatInput;

    if (chatInput && !chatInput.hasAttribute('mention-listener')) {
        chatInput.setAttribute('mention-listener', true);

        // Prevent form submission when suggestions are open
        const form = chatInput.closest('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                if (suggestionsBox) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);
        }

        // Handle send button clicks
        const sendButton = document.querySelector('[data-test="sendMessageButton"]');
        if (sendButton) {
            const originalClickHandler = sendButton.onclick;
            sendButton.onclick = (e) => {
                if (suggestionsBox) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                if (originalClickHandler) {
                    return originalClickHandler.call(sendButton, e);
                }
            };
        }
    }
}

/**
 * Get cached users or fetch new ones if cache is expired
 * @returns {Promise<Array>} Array of users
 */
async function getCachedUsers() {
    const now = Date.now();
    if (cachedUsers == null || now - lastCacheTime > CACHE_DURATION) {
        console.log('Fetching users...');
        cachedUsers = await getAllUsers();
        console.log('Users fetched:', cachedUsers);
        lastCacheTime = now;
    }
    return cachedUsers;
}

/**
 * Handle click events on suggestion items
 * @param {Event} e Click event
 */
function handleGlobalClick(e) {
    if (suggestionsBox) {
        const suggestionItem = e.target.closest('.mention-suggestion-item');
        if (suggestionItem) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            selectSuggestion(suggestionItem);
            return false;
        } else if (!suggestionsBox.contains(e.target) && e.target.id !== 'message-input') {
            hideSuggestions();
        }
    }
}

/**
 * Handle keyboard events for navigation and selection
 * @param {KeyboardEvent} e Keyboard event
 */
function handleKeyDownGlobal(e: KeyboardEvent) {
    if (!suggestionsBox) {
        return;
    }

    if (e.target.id === 'message-input') {
        if (e.key === 'Enter') {
            const selectedItem = suggestionsBox.querySelector('.selected');
            if (selectedItem) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                selectSuggestion(selectedItem);
                return false;
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
            return false;
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            hideSuggestions();
            return false;
        }
    }
}

/**
 * Handle input changes and trigger suggestions display
 * @param {Event} e Input event
 */
function handleInput(e: Event) {
    if (e.target.id !== 'message-input') {
        return;
    }

    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
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
        searchAndShowSuggestions('', e.target, lastAtIndex);
        return;
    }

    searchAndShowSuggestions(textAfterAt, e.target, lastAtIndex);
}

/**
 * Search users and display suggestions
 * @param {string} query Search query
 * @param {HTMLElement} inputElement Input element
 * @param {number} atIndex Position of @
 */
async function searchAndShowSuggestions(query: string, inputElement: HTMLElement, atIndex: number) {
    try {
        const users = await getCachedUsers();
        const matches = users.filter(user =>
            user.name.toLowerCase().startsWith(query.toLowerCase())
        );

        if (matches.length > 0) {
            showSuggestions(matches, inputElement, atIndex);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        hideSuggestions();
    }
}

/**
 * Display suggestions box with matched users
 * @param {Array} users Matched users
 * @param {HTMLElement} inputElement Input element
 * @param {number} atIndex Position of @
 */
function showSuggestions(users: [], inputElement: HTMLElement, atIndex: number) {
    hideSuggestions();

    suggestionsBox = document.createElement('div');
    suggestionsBox.className = 'mention-suggestions';

    users.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'mention-suggestion-item';
        if (index === 0) {
            item.classList.add('selected');
        }

        const avatar = document.createElement('div');
        avatar.className = 'mention-avatar';
        avatar.style.backgroundColor = user.bgColor;
        avatar.textContent = user.initials;

        const name = document.createElement('span');
        name.textContent = user.name;

        item.appendChild(avatar);
        item.appendChild(name);

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectSuggestion(item);
        });

        item.addEventListener('mouseover', () => {
            const selected = suggestionsBox.querySelector('.selected');
            if (selected) {
                selected.classList.remove('selected');
            }
            item.classList.add('selected');
        });

        suggestionsBox.appendChild(item);
    });

    const inputRect = inputElement.getBoundingClientRect();
    suggestionsBox.style.position = 'fixed';
    suggestionsBox.style.left = `${inputRect.left}px`;
    suggestionsBox.style.width = `${inputRect.width}px`;
    suggestionsBox.style.zIndex = '9999';

    document.body.appendChild(suggestionsBox);

    // Position the suggestions box based on available space
    const boxHeight = suggestionsBox.offsetHeight;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - inputRect.bottom;

    if (spaceBelow < boxHeight && inputRect.top > boxHeight) {
        suggestionsBox.style.top = `${inputRect.top - boxHeight - 5}px`;
    } else {
        suggestionsBox.style.top = `${inputRect.bottom + 5}px`;
    }
}

/**
 * Hide suggestions box
 */
function hideSuggestions() {
    if (suggestionsBox) {
        suggestionsBox.remove();
        suggestionsBox = null;
    }
}

/**
 * Navigate through suggestions using keyboard
 * @param {number} direction 1 for down, -1 for up
 */
function navigateSuggestions(direction: number) {
    const items = suggestionsBox.querySelectorAll('.mention-suggestion-item');
    const currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
    items[currentIndex].classList.remove('selected');

    let newIndex = currentIndex + direction;
    if (newIndex < 0) {
        newIndex = items.length - 1;
    }
    if (newIndex >= items.length) {
        newIndex = 0;
    }

    items[newIndex].classList.add('selected');
    items[newIndex].scrollIntoView({ block: 'nearest' });
}

/**
 * Select a suggestion and insert it into the input
 * @param {HTMLElement} item Selected suggestion item
 */
function selectSuggestion(item: HTMLElement) {
    if (!currentInput || !item) {
        return;
    }

    const text = currentInput.value;
    const cursorPos = currentInput.selectionStart;
    const textUpToCursor = text.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
        return;
    }

    const username = item.querySelector('span').textContent;
    if (!username) {
        return;
    }

    const beforeMention = text.slice(0, lastAtIndex);
    const afterMention = text.slice(cursorPos);

    // Add space after username if not already present
    const newText = `${beforeMention}@${username}${afterMention.startsWith(' ') ? '' : ' '}${afterMention}`;
    const newCursorPos = lastAtIndex + username.length + 2;

    currentInput.value = newText;
    currentInput.setSelectionRange(newCursorPos, newCursorPos);

    hideSuggestions();
    currentInput.focus();
}
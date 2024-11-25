export function checkForModeratorMessages(message: HTMLElement) {
    if (message.hasAttribute('moderator-checked')) {
        return;
    }
    message.setAttribute('moderator-checked', 'true');

    // Look for moderator avatar
    const moderatorAvatar = message.querySelector('[data-test="moderatorAvatar"]');
    if (moderatorAvatar) {
        addClassModerator(message);
    }
}

export function addClassModerator(message: HTMLElement) {
    // Add special styling class
    message.classList.add('moderator-message');

    // Add MOD badge
    const username = message.querySelector('.sc-lmONJn span');
    if (username && !username.querySelector('.moderator-badge')) {
        const badge = document.createElement('span');
        badge.className = 'moderator-badge';
        badge.textContent = 'MOD';
        username.appendChild(badge);
    }
}
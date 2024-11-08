/**
 * Initialize the moderator message highlighting system
 */
function setupModerator() {
    console.log('[WWSNB] Initializing moderator/teacher message highlighting module');

    // Create observer for new messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                checkModeratorMessages();
            }
        });
    });

    // Start observing document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Check existing messages
    checkModeratorMessages();
}

/**
 * Check for moderator messages and apply styling
 */
function checkModeratorMessages() {
    // Target all message containers
    const messages = document.querySelectorAll('.sc-leYdVB');

    messages.forEach(messageContainer => {
        // Skip already processed messages
        if (messageContainer.hasAttribute('moderator-checked')) {
            return;
        }
        messageContainer.setAttribute('moderator-checked', 'true');

        // Look for moderator avatar
        const moderatorAvatar = messageContainer.querySelector('[data-test="moderatorAvatar"]');

        if (moderatorAvatar) {
            // Add special styling class
            messageContainer.classList.add('moderator-message');

            // Add MOD badge
            const username = messageContainer.querySelector('.sc-lmONJn span');
            if (username && !username.querySelector('.moderator-badge')) {
                const badge = document.createElement('span');
                badge.className = 'moderator-badge';
                badge.textContent = 'MOD';
                username.appendChild(badge);
            }
        }
    });
}

// Initialize module
setupModerator();
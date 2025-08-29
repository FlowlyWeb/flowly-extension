import { wsManager } from "../../managers/websocket.manager";
import { isCurrentUserModerator, getActualUserName } from "../users/user.module";

/**
 * Manages the pause system for moderators to announce breaks
 */
class PauseManager {
    private state = {
        isActive: false,
        selectedDuration: null as number | null,
        reason: ''
    };

    private pauseDurations = [
        { id: '5', label: '5 minutes', minutes: 5 },
        { id: '10', label: '10 minutes', minutes: 10 },
        { id: '15', label: '15 minutes', minutes: 15 },
        { id: '30', label: '30 minutes', minutes: 30 },
        { id: 'custom', label: 'Durée personnalisée', minutes: 0 }
    ];

    /**
     * Initializes the pause manager
     */
    public setup(): void {
        console.log('[PauseManager] Setting up pause manager');
        
        // Subscribe to pause messages for all users
        wsManager.subscribe('pause', ['pause'], new Map([
            ['pause', this.handlePauseMessage.bind(this)]
        ]));

        console.log('[PauseManager] Subscribed to pause messages via WebSocket');

        // Only moderators can create pause announcements
        if (isCurrentUserModerator()) {
            this.createPauseButton();
            console.log('[Flowly] Pause Manager module initialized for moderator');
        } else {
            console.log('[Flowly] Pause Manager module initialized for participant');
        }
    }

    /**
     * Creates the pause button in the UI
     * @private
     */
    private createPauseButton(): void {
        const targetElement = document.querySelector('.sc-cAMaJD');
        if (!targetElement) return;

        const existingButton = document.querySelector('.sc-pause-container');
        if (existingButton) {
            existingButton.remove();
        }

        const buttonHTML = `
            <div class="sc-pause-container">
                <button 
                    aria-label="Annoncer une pause" 
                    aria-disabled="false" 
                    class="sc-dJjYzT cwAETT lg buttonWrapper" 
                    color="default" 
                    data-test="pauseButton"
                    data-tooltip="Annoncer une pause"
                    id="flowly-pause-btn" 
                    position="bottom">
                        <span color="default" class="sc-hGPBjI gEUNaV">
                            <i class="sc-bdvvtL goIptw sc-fFeiMQ gfZumy icon-bbb-time"></i>
                        </span>
                        <span class="sc-ieecCq QhyOD">Pause</span>
                </button>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buttonHTML;
        const container = tempDiv.firstElementChild;

        if (container) {
            const button = container.querySelector('#flowly-pause-btn');
            button?.addEventListener('click', this.handlePauseClick.bind(this));

            // Add tooltip functionality
            this.setupTooltip(button as HTMLElement);

            targetElement.appendChild(container);
        }
    }

    /**
     * Sets up the tooltip for the pause button
     * @param button
     * @private
     */
    private setupTooltip(button: HTMLElement): void {
        if (!button) return;

        const existingTooltip = document.getElementById('flowly-pause-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.id = 'flowly-pause-tooltip';
        tooltip.className = 'sc-tooltip';
        tooltip.textContent = button.getAttribute('data-tooltip') || '';
        document.body.appendChild(tooltip);

        button.addEventListener('mouseenter', () => {
            const rect = button.getBoundingClientRect();

            tooltip.style.display = 'block';
            const tooltipHeight = tooltip.offsetHeight;
            tooltip.style.top = `${rect.top - tooltipHeight - 8}px`;
            tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;

            tooltip.offsetHeight;
            tooltip.classList.add('visible');
        });

        button.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
            tooltip.addEventListener('transitionend', function handler() {
                tooltip.style.display = 'none';
                tooltip.removeEventListener('transitionend', handler);
            });
        });
    }

    /**
     * Handles the pause button click event
     * @param event
     * @private
     */
    private handlePauseClick(event: Event): void {
        event.stopPropagation();
        this.showPauseModal();
    }

    /**
     * Shows the pause configuration modal
     * @private
     */
    private showPauseModal(): void {
        const existingModal = document.querySelector('.sc-pause-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'sc-pause-modal';
        modal.innerHTML = `
            <div class="sc-pause-modal-backdrop"></div>
            <div class="sc-pause-modal-content">
                <div class="sc-pause-modal-header">
                    <h3>Annoncer une pause</h3>
                    <button class="sc-pause-modal-close" aria-label="Fermer">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                            <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"/>
                        </svg>
                    </button>
                </div>
                <div class="sc-pause-modal-body">
                    <div class="sc-pause-duration-section">
                        <label class="sc-pause-label">Durée de la pause :</label>
                        <div class="sc-pause-duration-options">
                            ${this.pauseDurations.map(duration => `
                                <button class="sc-pause-duration-option" data-duration="${duration.id}" data-minutes="${duration.minutes}">
                                    ${duration.label}
                                </button>
                            `).join('')}
                        </div>
                        <div class="sc-pause-custom-duration" style="display: none;">
                            <input type="number" class="sc-pause-custom-input" placeholder="Minutes" min="1" max="120" />
                            <span>minutes</span>
                        </div>
                    </div>
                    <div class="sc-pause-reason-section">
                        <label class="sc-pause-label" for="pause-reason">Raison (optionnel) :</label>
                        <textarea 
                            id="pause-reason" 
                            class="sc-pause-reason-input" 
                            placeholder="Ex: Pause technique, pause déjeuner..." 
                            maxlength="200"
                            rows="3">
                        </textarea>
                    </div>
                </div>
                <div class="sc-pause-modal-footer">
                    <button class="sc-pause-cancel-btn">Annuler</button>
                    <button class="sc-pause-confirm-btn" disabled>Annoncer la pause</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.setupModalEventListeners(modal);

        // Show modal with animation
        modal.offsetHeight; // Force reflow
        modal.classList.add('visible');
    }

    /**
     * Sets up event listeners for the modal
     * @param modal
     * @private
     */
    private setupModalEventListeners(modal: HTMLElement): void {
        const backdrop = modal.querySelector('.sc-pause-modal-backdrop');
        const closeBtn = modal.querySelector('.sc-pause-modal-close');
        const cancelBtn = modal.querySelector('.sc-pause-cancel-btn');
        const confirmBtn = modal.querySelector('.sc-pause-confirm-btn');
        const durationOptions = modal.querySelectorAll('.sc-pause-duration-option');
        const customDurationDiv = modal.querySelector('.sc-pause-custom-duration') as HTMLElement;
        const customInput = modal.querySelector('.sc-pause-custom-input') as HTMLInputElement;
        const reasonInput = modal.querySelector('.sc-pause-reason-input') as HTMLTextAreaElement;

        // Close modal events
        [backdrop, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', () => this.closePauseModal(modal));
        });

        // Duration selection
        durationOptions.forEach(option => {
            option.addEventListener('click', () => {
                durationOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                const durationId = (option as HTMLElement).dataset.duration;
                const minutes = parseInt((option as HTMLElement).dataset.minutes || '0');

                if (durationId === 'custom') {
                    customDurationDiv.style.display = 'flex';
                    customInput.focus();
                } else {
                    customDurationDiv.style.display = 'none';
                    this.state.selectedDuration = minutes;
                }

                this.updateConfirmButton(modal);
            });
        });

        // Custom duration input
        customInput?.addEventListener('input', () => {
            const minutes = parseInt(customInput.value);
            this.state.selectedDuration = isNaN(minutes) ? null : minutes;
            this.updateConfirmButton(modal);
        });

        // Reason input
        reasonInput?.addEventListener('input', () => {
            this.state.reason = reasonInput.value.trim();
        });

        // Confirm button
        confirmBtn?.addEventListener('click', () => {
            this.announcePause();
            this.closePauseModal(modal);
        });

        // ESC key to close
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.closePauseModal(modal);
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Updates the confirm button state based on selection
     * @param modal
     * @private
     */
    private updateConfirmButton(modal: HTMLElement): void {
        const confirmBtn = modal.querySelector('.sc-pause-confirm-btn') as HTMLButtonElement;
        if (confirmBtn) {
            confirmBtn.disabled = !this.state.selectedDuration || this.state.selectedDuration <= 0;
        }
    }

    /**
     * Closes the pause modal
     * @param modal
     * @private
     */
    private closePauseModal(modal: HTMLElement): void {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
        }, 300);

        // Reset state
        this.state = {
            isActive: false,
            selectedDuration: null,
            reason: ''
        };
    }

    /**
     * Handles incoming pause messages from the server
     * @param data
     * @private
     */
    private handlePauseMessage(data: any): void {
        console.log('[PauseManager] Received pause message:', data);
        
        if (data.type === 'pause' && data.data) {
            const { userId, duration, reason, endTimeFormatted } = data.data;
            console.log('[PauseManager] Processing pause notification - UserId:', userId, 'Duration:', duration, 'Reason:', reason, 'EndTime:', endTimeFormatted);
            this.showPauseNotification(duration, reason, endTimeFormatted, userId);
        } else {
            console.log('[PauseManager] Invalid pause message format:', data);
        }
    }

    /**
     * Shows a pause notification to all users
     * @param duration
     * @param reason
     * @param endTimeFormatted
     * @param moderatorId
     * @private
     */
    private showPauseNotification(duration: number, reason: string | undefined, endTimeFormatted: string, moderatorId: string): void {
        console.log('[PauseManager] showPauseNotification called - Duration:', duration, 'Reason:', reason, 'EndTime:', endTimeFormatted);
        
        const existingNotification = document.querySelector('.sc-pause-notification');
        if (existingNotification) {
            console.log('[PauseManager] Removing existing notification');
            // Annuler le timer automatique de l'ancienne notification
            const oldTimeout = (existingNotification as any).autoHideTimeout;
            if (oldTimeout) {
                clearTimeout(oldTimeout);
            }
            existingNotification.remove();
        }

        // Si durée = 0, c'est un arrêt de pause - on affiche juste une notification temporaire et on sort
        if (duration === 0) {
            console.log('[PauseManager] Pause stopped, showing end notification');
            this.showPauseEndNotification(reason);
            return;
        }

        const notification = document.createElement('div');
        notification.className = 'sc-pause-notification';
        
        let reasonText = '';
        if (reason && reason.trim()) {
            reasonText = `<div class="sc-pause-notification-reason">📝 ${reason}</div>`;
        }

        // Boutons de contrôle pour les modérateurs
        let moderatorActions = '';
        if (isCurrentUserModerator()) {
            moderatorActions = `
                <div class="sc-pause-notification-actions">
                    <button class="sc-pause-stop-btn" data-action="stop">Arrêter</button>
                    <button class="sc-pause-extend-btn" data-action="extend">Prolonger</button>
                </div>
            `;
        }

        notification.innerHTML = `
            <div class="sc-pause-notification-content">
                <div class="sc-pause-notification-header">
                    <div class="sc-pause-notification-icon">⏸️</div>
                    <div class="sc-pause-notification-title">Pause en cours</div>
                    <button class="sc-pause-notification-close" aria-label="Fermer">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.8 3.2L8 8l4.8 4.8-1.2 1.2L8 9.2 3.2 14l-1.2-1.2L6.8 8 2 3.2 3.2 2 8 6.8 12.8 2z"/>
                        </svg>
                    </button>
                </div>
                <div class="sc-pause-notification-body">
                    <div class="sc-pause-notification-time">🕐 Retour prévu à <strong>${endTimeFormatted}</strong></div>
                    <div class="sc-pause-notification-duration">Durée : ${duration} minute${duration > 1 ? 's' : ''}</div>
                    ${reasonText}
                    ${moderatorActions}
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Close button functionality
        const closeBtn = notification.querySelector('.sc-pause-notification-close');
        closeBtn?.addEventListener('click', () => {
            notification.classList.add('closing');
            setTimeout(() => notification.remove(), 300);
        });

        // Moderator control buttons
        if (isCurrentUserModerator()) {
            const stopBtn = notification.querySelector('.sc-pause-stop-btn');
            const extendBtn = notification.querySelector('.sc-pause-extend-btn');

            stopBtn?.addEventListener('click', () => {
                this.stopPause();
                notification.classList.add('closing');
                setTimeout(() => notification.remove(), 300);
            });

            extendBtn?.addEventListener('click', () => {
                this.showExtendPauseModal(notification, duration, endTimeFormatted);
            });
        }

        // Auto-show with animation
        notification.offsetHeight; // Force reflow
        notification.classList.add('visible');

        console.log('[PauseManager] Pause notification created and shown');

        // Easter egg: Pluie d'emojis café
        if (reason && this.isCoffeeRelated(reason)) {
            console.log('[PauseManager] Coffee break detected! Starting emoji rain ☕');
            this.startCoffeeEmojiRain();
        }

        // Auto-hide after the pause duration + 1 minute
        const autoHideTimeout = setTimeout(() => {
            if (notification.parentNode) {
                console.log('[PauseManager] Auto-hiding pause notification (natural end)');
                notification.classList.add('closing');
                setTimeout(() => {
                    notification.remove();
                    // Afficher une notification de fin naturelle
                    this.showPauseEndNotification();
                }, 300);
            }
        }, duration * 60000); // Exactement à la fin de la pause

        // Stocker le timeout pour pouvoir l'annuler si la pause est arrêtée manuellement
        (notification as any).autoHideTimeout = autoHideTimeout;
    }

    /**
     * Announces the pause by sending it via WebSocket
     * @private
     */
    private announcePause(): void {
        console.log('[PauseManager] announcePause called with state:', this.state);
        
        if (!this.state.selectedDuration) {
            console.error('[PauseManager] No duration selected');
            return;
        }

        const username = getActualUserName();
        const sessionId = wsManager.getSessionId();

        console.log('[PauseManager] Username:', username, 'SessionId:', sessionId);

        if (!username || !sessionId) {
            console.error('[PauseManager] Cannot send pause: missing username or sessionId');
            return;
        }

        console.log('[PauseManager] Sending pause via WebSocket - Duration:', this.state.selectedDuration, 'Reason:', this.state.reason);

        // Send pause via WebSocket
        wsManager.sendPause(sessionId, username, this.state.selectedDuration, this.state.reason || undefined);

        console.log('[PauseManager] Pause sent successfully');

        // Show confirmation to moderator
        this.showConfirmation();
    }


    /**
     * Checks if the reason is coffee-related for easter egg
     * @param reason
     * @private
     */
    private isCoffeeRelated(reason: string): boolean {
        const coffeeKeywords = ['café', 'cafe', 'coffee', '☕', 'cafés', 'cafes', 'cappuccino', 'espresso'];
        return coffeeKeywords.some(keyword => reason.toLowerCase().includes(keyword));
    }

    /**
     * Creates a coffee emoji rain animation
     * @private
     */
    private startCoffeeEmojiRain(): void {
        const coffeeEmojis = ['☕', '🤎', '🫘', '☕', '🥤', '☕', '🍵', '☕'];
        const rainContainer = document.createElement('div');
        rainContainer.className = 'coffee-emoji-rain';
        rainContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(rainContainer);

        // Créer plusieurs vagues d'emojis pour éviter les trous
        const totalEmojis = 80; // Plus d'emojis !
        const waveCount = 4; // Plusieurs vagues
        const emojisPerWave = totalEmojis / waveCount;

        for (let wave = 0; wave < waveCount; wave++) {
            setTimeout(() => {
                for (let i = 0; i < emojisPerWave; i++) {
                    setTimeout(() => {
                        const emoji = document.createElement('div');
                        emoji.textContent = coffeeEmojis[Math.floor(Math.random() * coffeeEmojis.length)];
                        
                        const size = Math.random() * 30 + 25; // Plus gros : 25px à 55px
                        const leftPosition = (i / emojisPerWave * 100) + (Math.random() * 10 - 5); // Meilleure répartition
                        const animationDuration = Math.random() * 2 + 3; // 3-5 secondes
                        
                        emoji.style.cssText = `
                            position: absolute;
                            font-size: ${size}px;
                            left: ${leftPosition}%;
                            top: -80px;
                            animation: coffeeRainFall ${animationDuration}s linear forwards;
                            opacity: ${Math.random() * 0.5 + 0.5};
                            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
                        `;
                        rainContainer.appendChild(emoji);

                        // Supprimer l'emoji après l'animation
                        setTimeout(() => {
                            if (emoji.parentNode) {
                                emoji.remove();
                            }
                        }, animationDuration * 1000 + 1000);
                    }, Math.random() * 500); // Étalement dans la vague
                }
            }, wave * 1000); // Délai entre les vagues
        }

        // Supprimer le container après 12 secondes
        setTimeout(() => {
            if (rainContainer.parentNode) {
                rainContainer.remove();
            }
        }, 12000);
    }

    /**
     * Stops the current pause early (moderators only)
     * @private
     */
    private stopPause(): void {
        const username = getActualUserName();
        const sessionId = wsManager.getSessionId();

        if (!username || !sessionId) {
            console.error('[PauseManager] Cannot stop pause: missing username or sessionId');
            return;
        }

        console.log('[PauseManager] Stopping pause early');

        // Send stop pause message via WebSocket
        wsManager.sendPause(sessionId, username, 0, 'Pause arrêtée par le modérateur');

        // Show confirmation
        const confirmation = document.createElement('div');
        confirmation.className = 'sc-pause-confirmation';
        confirmation.textContent = 'Pause arrêtée';
        confirmation.style.backgroundColor = '#dc3545';
        document.body.appendChild(confirmation);
        setTimeout(() => confirmation.remove(), 3000);
    }

    /**
     * Shows modal to extend current pause
     * @param notification
     * @param currentDuration
     * @param currentEndTime
     * @private
     */
    private showExtendPauseModal(notification: HTMLElement, currentDuration: number, currentEndTime: string): void {
        const modal = document.createElement('div');
        modal.className = 'sc-pause-extend-modal';
        modal.innerHTML = `
            <div class="sc-pause-modal-backdrop"></div>
            <div class="sc-pause-modal-content" style="max-width: 400px;">
                <div class="sc-pause-modal-header">
                    <h3>Prolonger la pause</h3>
                    <button class="sc-pause-modal-close" aria-label="Fermer">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                            <path d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"/>
                        </svg>
                    </button>
                </div>
                <div class="sc-pause-modal-body">
                    <p>Pause actuelle : ${currentDuration} minutes (fin à ${currentEndTime})</p>
                    <label class="sc-pause-label">Ajouter :</label>
                    <div class="sc-pause-extend-options">
                        <button class="sc-pause-extend-option" data-minutes="5">+5 min</button>
                        <button class="sc-pause-extend-option" data-minutes="10">+10 min</button>
                        <button class="sc-pause-extend-option" data-minutes="15">+15 min</button>
                    </div>
                </div>
                <div class="sc-pause-modal-footer">
                    <button class="sc-pause-cancel-btn">Annuler</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        const backdrop = modal.querySelector('.sc-pause-modal-backdrop');
        const closeBtn = modal.querySelector('.sc-pause-modal-close');
        const cancelBtn = modal.querySelector('.sc-pause-cancel-btn');
        const extendOptions = modal.querySelectorAll('.sc-pause-extend-option');

        [backdrop, closeBtn, cancelBtn].forEach(element => {
            element?.addEventListener('click', () => {
                modal.classList.add('closing');
                setTimeout(() => modal.remove(), 300);
            });
        });

        extendOptions.forEach(option => {
            option.addEventListener('click', () => {
                const additionalMinutes = parseInt((option as HTMLElement).dataset.minutes || '0');
                this.extendPause(currentDuration + additionalMinutes);
                modal.classList.add('closing');
                setTimeout(() => modal.remove(), 300);
            });
        });

        // Show modal
        modal.offsetHeight; // Force reflow
        modal.classList.add('visible');
    }

    /**
     * Extends the current pause
     * @param newDuration
     * @private
     */
    private extendPause(newDuration: number): void {
        const username = getActualUserName();
        const sessionId = wsManager.getSessionId();

        if (!username || !sessionId) {
            console.error('[PauseManager] Cannot extend pause: missing username or sessionId');
            return;
        }

        console.log('[PauseManager] Extending pause to', newDuration, 'minutes');

        // Send extended pause via WebSocket
        wsManager.sendPause(sessionId, username, newDuration, 'Pause prolongée par le modérateur');

        // Show confirmation
        const confirmation = document.createElement('div');
        confirmation.className = 'sc-pause-confirmation';
        confirmation.textContent = `Pause prolongée à ${newDuration} minutes`;
        confirmation.style.backgroundColor = '#28a745';
        document.body.appendChild(confirmation);
        setTimeout(() => confirmation.remove(), 3000);
    }

    /**
     * Shows a temporary notification when pause ends/is stopped
     * @param reason
     * @private
     */
    private showPauseEndNotification(reason?: string): void {
        const endNotification = document.createElement('div');
        endNotification.className = 'sc-pause-end-notification';
        
        let message = 'Pause terminée';
        let statusClass = 'success';
        if (reason && reason.includes('arrêtée par le modérateur')) {
            message = 'Pause arrêtée';
            statusClass = 'stopped';
        }
        
        endNotification.innerHTML = `
            <div class="sc-pause-end-content ${statusClass}">
                <div class="sc-pause-end-status"></div>
                <div class="sc-pause-end-message">${message}</div>
            </div>
        `;

        document.body.appendChild(endNotification);
        
        // Animation d'entrée
        endNotification.offsetHeight; // Force reflow
        endNotification.classList.add('visible');
        
        // Auto-remove après 3 secondes avec animation de sortie
        setTimeout(() => {
            endNotification.classList.add('closing');
            setTimeout(() => {
                if (endNotification.parentNode) {
                    endNotification.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * Shows a confirmation message for the pause announcement
     * @private
     */
    private showConfirmation(): void {
        const confirmation = document.createElement('div');
        confirmation.className = 'sc-pause-confirmation';
        confirmation.textContent = 'Pause annoncée aux étudiants';

        document.body.appendChild(confirmation);
        setTimeout(() => confirmation.remove(), 3000);
    }

    /**
     * Cleans up the pause manager
     */
    public cleanup(isRefresh: boolean = false): void {
        const container = document.querySelector('.sc-pause-container');
        const tooltip = document.querySelector('#flowly-pause-tooltip');
        const modal = document.querySelector('.sc-pause-modal');

        container?.remove();
        tooltip?.remove();
        modal?.remove();
    }
}

export const pauseManager = new PauseManager();
import { wsManager } from "../../managers/websocket.manager";
import {getActualUserName, isCurrentUserModerator} from "../users/user.module";
import {WarningState} from "../../../types/warning";

/**
 * Manages the warning system for students to report technical issues
 */
class WarningManager {
    private state: WarningState = {
        isActive: false,
        problemType: null
    };

    private warningCounts: Map<string, Set<string>> = new Map();
    private audioContext?: AudioContext;
    private readonly WARNING_COOLDOWN = 120000; // 120 seconds in milliseconds

    private warningTypes = [
        { id: 'audio', label: 'Problème de son' },
        { id: 'video', label: 'Problème de vidéo' },
        { id: 'screen', label: 'Problème de partage d\'écran' },
        { id: 'connection', label: 'Problème de connexion' }
    ];

    /**
     * Initializes the warning manager
     */
    public setup(): void {
        this.createWarningButton();
        this.setupTooltip();

        wsManager.subscribe('warning', ['warning'], new Map([
            ['warning', this.handleWarningMessage.bind(this)]
        ]));

        console.log('[Flowly] Warning module initialized');
    }

    /**
     * Generates a unique key for a warning type based on the current time window
     * @param problemType
     * @private
     */
    private getWarningKey(problemType: string): string {
        const timeWindow = Math.floor(Date.now() / this.WARNING_COOLDOWN);
        return `${problemType}-${timeWindow}`;
    }

    /**
     * Handles incoming warning messages from the server
     * @param data
     * @private
     */
    private handleWarningMessage(data: any): void {
        if (data.type === 'warning' && data.data && isCurrentUserModerator()) {
            const { userId, problemType, timestamp } = data.data;
            const warningKey = this.getWarningKey(problemType);

            if (!this.warningCounts.has(warningKey)) {
                this.warningCounts.set(warningKey, new Set());
            }

            const users = this.warningCounts.get(warningKey)!;
            const isNewWarning = !users.has(userId);
            users.add(userId);

            if (isNewWarning) {
                this.showModeratorAlert(problemType, users, timestamp);
                this.playNotificationSound();
            } else {
                this.updateExistingAlert(problemType, users.size);
            }
        }
    }

    /**
     * Updates the user count in an existing alert
     * @param problemType
     * @param count
     * @private
     */
    private updateExistingAlert(problemType: string, count: number): void {
        const existingAlert = document.querySelector(`.sc-warning-alert[data-problem-type="${problemType}"]`);
        if (existingAlert) {
            const messageElement = existingAlert.querySelector('.sc-warning-alert-message');
            if (messageElement) {
                messageElement.innerHTML = this.getUserCountMessage(count);
            }
        }
    }

    /**
     * Generates the user count message based on the number of users
     * @param count
     * @private
     */
    private getUserCountMessage(count: number): string {
        if (count === 1) return '<strong>Un étudiant</strong> signale un problème';
        return `<strong>${count} étudiants</strong> signalent un problème`;
    }

    /**
     * Displays a moderator alert for a new warning
     * @param problemType
     * @param users
     * @param timestamp
     * @private
     */
    private showModeratorAlert(problemType: string, users: Set<string>, timestamp: number): void {
        const warningType = this.warningTypes.find(w => w.id === problemType);
        const formattedTime = new Date(timestamp).toLocaleTimeString();

        const alertContainer = document.createElement('div');
        alertContainer.className = 'sc-warning-alert';

        alertContainer.innerHTML = `
            <div class="sc-warning-alert-content">
                <div class="sc-warning-alert-header">
                    <div class="sc-warning-alert-title">⚠️ Problème Signalé</div>
                </div>
                <div class="sc-warning-alert-body">
                    <div class="sc-warning-alert-message">
                        ${this.getUserCountMessage(users.size)}
                    </div>
                    <div class="sc-warning-alert-type">
                        ${warningType?.label || problemType}
                    </div>
                    <div class="sc-warning-alert-time">
                        Signalé à ${formattedTime}
                    </div>
                </div>
                <div class="sc-warning-alert-footer">
                    <button class="sc-warning-alert-resolve" title="Marquer comme résolu">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        Résolu
                    </button>
                    <button class="sc-warning-alert-later" title="Reporter">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v10l4.5 4.5"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Plus tard
                    </button>
                </div>
            </div>
        `;

        const resolveButton = alertContainer.querySelector('.sc-warning-alert-resolve');
        const laterButton = alertContainer.querySelector('.sc-warning-alert-later');

        resolveButton?.addEventListener('click', () => {
            alertContainer.classList.add('resolved');
            setTimeout(() => {
                alertContainer.classList.add('closing');
                setTimeout(() => alertContainer.remove(), 300);
            }, 1000);
        });

        laterButton?.addEventListener('click', () => {
            alertContainer.classList.add('postponed');
            alertContainer.classList.add('closing');
            setTimeout(() => alertContainer.remove(), 300);

            setTimeout(() => {
                const warningKey = this.getWarningKey(problemType);
                const users = this.warningCounts.get(warningKey);

                const existingAlert = document.querySelector(`.sc-warning-alert[data-problem-type="${problemType}"]`);
                if (existingAlert || !users) return;

                this.showModeratorAlert(problemType, users, timestamp);
                this.playNotificationSound();
            }, 5 * 60 * 1000);
        });

        document.body.appendChild(alertContainer);
        alertContainer.offsetHeight;
        alertContainer.classList.add('visible');
    }

    /**
     * Initializes the audio context for playing sounds if needed
     * @private
     */
    private setupAudioContext(): void {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
    }

    /**
     * Plays a notification sound for new warnings
     * @private
     */
    private playNotificationSound(): void {
        try {
            this.setupAudioContext();
            if (!this.audioContext) return;

            const frequencies = [523.25, 659.25]; // Do5, Mi5 - C major chord
            const time = this.audioContext.currentTime;

            frequencies.forEach((freq, index) => {

                if (!this.audioContext) return;

                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, time);

                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(0.1, time + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, time + 0.4);

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.start(time + index * 0.15);
                oscillator.stop(time + 0.4);
            });

        } catch (error) {
            console.warn('[WarningManager] Erreur lors de la lecture du son:', error);
        }
    }

    /**
     * Creates the warning button in the UI
     * @private
     */
    private createWarningButton(): void {
        const targetElement = document.querySelector('.sc-cAMaJD');
        if (!targetElement) return;

        const existingButton = document.querySelector('.sc-warning-container');
        if (existingButton) {
            existingButton.remove();
        }

        const buttonHTML = `
            <div class="sc-warning-container">
                <button 
                    aria-label="Signaler un problème" 
                    aria-disabled="false" 
                    class="sc-dJjYzT cwAETT lg buttonWrapper" 
                    color="default" 
                    data-test="warningButton"
                    data-tooltip="Signaler un problème technique"
                    id="flowly-warning-btn" 
                    position="bottom">
                        <span color="default" class="sc-hGPBjI gEUNaV">
                            <i class="sc-bdvvtL goIptw sc-fFeiMQ gfZumy icon-bbb-warning"></i>
                        </span>
                        <span class="sc-ieecCq QhyOD">Signaler un problème</span>
                </button>
                <div id="flowly-warning-options" class="sc-warning-options" style="display: none;">
                    <div class="sc-warning-options-content">
                        ${this.warningTypes.map(type => `
                            <button class="sc-warning-option" data-problem-type="${type.id}">
                                ${type.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = buttonHTML;
        const container = tempDiv.firstElementChild;

        if (container) {
            const button = container.querySelector('#flowly-warning-btn');
            const options = container.querySelector('#flowly-warning-options');

            button?.addEventListener('click', this.handleWarningClick.bind(this));
            options?.querySelectorAll('.sc-warning-option').forEach(option => {
                option.addEventListener('click', () =>
                    this.sendWarning((option as HTMLElement).dataset.problemType || '')
                );
            });

            document.addEventListener('click', (e) => {
                if (this.state.isActive && !container.contains(e.target as Node)) {
                    this.hideWarningOptions();
                }
            });

            targetElement.appendChild(container);
        }
    }

    /**
     * Sets up the tooltip for the warning button
     * @private
     */
    private setupTooltip(): void {
        const button = document.getElementById('flowly-warning-btn');
        if (!button) return;

        const existingTooltip = document.getElementById('flowly-warning-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.id = 'flowly-warning-tooltip';
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
     * Handles the warning button click event
     * @param event
     * @private
     */
    private handleWarningClick(event: Event): void {
        event.stopPropagation();

        const optionsMenu = document.getElementById('flowly-warning-options');
        const button = document.getElementById('flowly-warning-btn');
        if (!optionsMenu || !button) return;

        if (!this.state.isActive) {
            this.showWarningOptions(optionsMenu);
            button.removeEventListener('mouseenter', this.showTooltip);
            button.removeEventListener('mouseleave', this.hideTooltip);
        } else {
            this.hideWarningOptions();
            button.addEventListener('mouseenter', this.showTooltip);
            button.addEventListener('mouseleave', this.hideTooltip);
        }
    }

    /**
     * Shows the warning tooltip
     */
    private showTooltip = () => {
        const button = document.getElementById('flowly-warning-btn');
        const tooltip = document.querySelector('.sc-tooltip') as HTMLElement;
        if (!button || !tooltip || this.state.isActive) return;

        const rect = button.getBoundingClientRect();
        tooltip.style.display = 'block';
        const tooltipHeight = (tooltip as HTMLElement).offsetHeight;
        (tooltip as HTMLElement).style.top = `${rect.top - tooltipHeight - 8}px`;
        (tooltip as HTMLElement).style.left = `${rect.left + (rect.width / 2) - ((tooltip as HTMLElement).offsetWidth / 2)}px`;

        tooltip.offsetHeight;
        tooltip.classList.add('visible');
    }

    /**
     * Hides the warning tooltip
     */
    private hideTooltip = () => {
        const tooltip = document.querySelector('.sc-tooltip');
        if (!tooltip) return;

        tooltip.classList.remove('visible');
        tooltip.addEventListener('transitionend', function handler() {
            (tooltip as HTMLElement).style.display = 'none';
            tooltip.removeEventListener('transitionend', handler);
        });
    }

    /**
     * Shows the warning options menu
     * @param optionsMenu
     * @private
     */
    private showWarningOptions(optionsMenu: HTMLElement): void {
        const button = document.getElementById('flowly-warning-btn');
        if (!button) return;

        optionsMenu.style.display = 'block';

        optionsMenu.offsetHeight;
        optionsMenu.classList.add('visible');

        const menuRect = optionsMenu.getBoundingClientRect();

        if (menuRect.right > window.innerWidth) {
            optionsMenu.style.right = '0';
            optionsMenu.style.left = 'auto';
            optionsMenu.style.transform = 'translateY(0)';
        }

        this.state.isActive = true;
        button.setAttribute('aria-expanded', 'true');
    }

    /**
     * Hides the warning options menu
     * @private
     */
    private hideWarningOptions(): void {
        const optionsMenu = document.getElementById('flowly-warning-options');
        const button = document.getElementById('flowly-warning-btn');

        if (optionsMenu) {
            optionsMenu.classList.remove('visible');
            optionsMenu.addEventListener('transitionend', function handler() {
                optionsMenu.style.display = 'none';
                optionsMenu.removeEventListener('transitionend', handler);
            });
        }

        if (button) {
            button.setAttribute('aria-expanded', 'false');
        }

        this.state.isActive = false;
    }

    /**
     * Sends a warning message to the server
     * @param problemType
     * @private
     */
    private sendWarning(problemType: string): void {
        const username = getActualUserName();
        const sessionId = wsManager.getSessionId();

        if (!username || !sessionId) {
            console.error('[WarningManager] Cannot send warning: missing username or sessionId');
            return;
        }

        wsManager.sendWarning(sessionId, username, problemType);

        this.hideWarningOptions();
        this.showConfirmation(problemType);
    }

    /**
     * Shows a confirmation message for the warning
     * @param problemType
     * @private
     */
    private showConfirmation(problemType: string): void {
        const confirmation = document.createElement('div');
        confirmation.className = 'sc-warning-confirmation';
        confirmation.textContent = 'Problème signalé au professeur';

        document.body.appendChild(confirmation);
        setTimeout(() => confirmation.remove(), 3000);
    }

    /**
     * Cleans up the warning manager
     */
    public cleanup(isRefresh: boolean = false): void {
        const container = document.querySelector('.sc-warning-container');
        const tooltip = document.querySelector('.sc-tooltip');

        container?.remove();
        tooltip?.remove();
    }
}

export const warningManager = new WarningManager();
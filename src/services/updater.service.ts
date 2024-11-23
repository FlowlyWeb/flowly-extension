import { UpdateConfig } from "@/config/update.config";
import * as process from "node:process";

/**
 * Class UpdaterService
 * Handles the update process of the extension.
 */
export class UpdaterService {

    // UpdateState interface
    private state: UpdateState = {
        checking: false,
        downloading: false,
        error: null,
        lastCheck: null,
    };

    // Version interface
    private version: Version = {
        current: browser.runtime.getManifest().version,
        latest: null,
        updateAvailable: false,
    };

    constructor() {
        this.init();
    }

    /**
     * Initializes the updater service.
     * @returns A promise that resolves when the service is initialized.
     */
    private async init(): Promise<void> {

        await this.checkForUpdates();
        setInterval(() => this.checkForUpdates(), UpdateConfig.UPDATE_CHECK_INTERVAL);

        // Listen for messages from the background script
        browser.runtime.onMessage.addListener((
            message: UpdaterMessage,
            sender: browser.runtime.MessageSender,
            sendResponse: (response?: any) => void
        )=> {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

    }

    /**
     * Handles the messages from the background script.
     * @param message The message to handle.
     * @param sender The sender of the message.
     * @param sendResponse The function to send a response.
     * @returns A promise that resolves when the message is handled.
     */
    private async handleMessage(
        message: UpdaterMessage,
        sender: browser.runtime.MessageSender,
        sendResponse: (response?: any) => void
    ) : Promise<void> {

        switch (message.type) {

            case 'CHECK_UPDATES':
                const updateInfo = await this.checkForUpdates();
                sendResponse(updateInfo);
                break;

            case 'INSTALL_UPDATE':
                const installResult = await this.installUpdate();
                sendResponse(installResult);
                break;

            case 'GET_STATUS':
                sendResponse({
                    state: this.state,
                    version: this.version,
                } as UpdaterStatus);
                break;
        }

    }

    /**
     * Checks for updates.
     * @returns A promise that resolves with the update check result.
     * @throws An error if the update check fails.
     * @remarks The update check is rate-limited to prevent excessive requests.
     */
    private async checkForUpdates(): Promise<UpdateCheckResult> {
        if (
            this.state.checking ||
            (this.state.lastCheck &&
                Date.now() - this.state.lastCheck < UpdateConfig.MIN_CHECK_INTERVAL)
        ) {
            return {
                updateAvailable: this.version.updateAvailable,
                version: this.version.latest || undefined
            };
        }

        try {
            this.state.checking = true;
            this.state.error = null;

            const response = await fetch(UpdateConfig.UPDATE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as UpdateResponse;
            const latestVersion = data.addons[UpdateConfig.EXTENSION_ID]?.updates[0]?.version;

            if (!latestVersion) {
                throw new Error('Invalid update data received');
            }

            this.version.latest = latestVersion;
            this.version.updateAvailable = this.isNewVersionAvailable(
                latestVersion,
                this.version.current
            );

            if (this.version.updateAvailable) {
                await this.notifyUpdateAvailable(latestVersion);
            }

            return {
                updateAvailable: this.version.updateAvailable,
                version: latestVersion
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.state.error = errorMessage;
            return {
                updateAvailable: false,
                error: errorMessage
            };
        } finally {
            this.state.checking = false;
            this.state.lastCheck = Date.now();
        }
    }

    /**
     * Installs the update.
     * @returns A promise that resolves with the installation result.
     * @throws An error if the update installation fails.
     */
    private async installUpdate(): Promise<InstallResult> {
        if (this.state.downloading || !this.version.updateAvailable) {
            return { success: false, error: 'No update available or already downloading' };
        }

        try {
            this.state.downloading = true;

            const response = await fetch(
                `${process.env.UPDATE_SERVER}/download/${this.version.latest}`
            );
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            await browser.tabs.create({ url: blobUrl });

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 60000);

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.state.error = errorMessage;
            return { success: false, error: errorMessage };
        } finally {
            this.state.downloading = false;
        }
    }

    /**
     * Notifies the user that an update is available.
     * @param newVersion The new version that is available.
     * @returns A promise that resolves when the notification is shown.
     */
    private async notifyUpdateAvailable(newVersion: string): Promise<void> {
        await browser.notifications.create('update-available', {
            type: 'basic',
            iconUrl: browser.runtime.getURL('icons/wwsnb-48.png'),
            title: 'Mise à jour disponible',
            message: `La nouvelle version (${newVersion}) est disponible. Version actuelle: ${this.version.current}`,
            buttons: [
                { title: 'Installer maintenant' },
                { title: 'Plus tard' }
            ]
        });

        browser.notifications.onButtonClicked.addListener(
            async (notificationId, buttonIndex) => {
                if (notificationId === 'update-available') {
                    if (buttonIndex === 0) {
                        await this.installUpdate();
                    }
                    await browser.notifications.clear(notificationId);
                }
            }
        );
    }

    /**
     * Checks if a new version is available.
     * @param newVersion The new version to check.
     * @param currentVersion The current version to check.
     * @returns True if a new version is available, false otherwise.
     */
    private isNewVersionAvailable(newVersion: string, currentVersion: string): boolean {
        const parse = (v: string) => v.split('.').map(Number);
        const newParts = parse(newVersion);
        const currentParts = parse(currentVersion);

        for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
            const newPart = newParts[i] || 0;
            const currentPart = currentParts[i] || 0;

            if (newPart > currentPart) return true;
            if (newPart < currentPart) return false;
        }

        return false;
    }


}
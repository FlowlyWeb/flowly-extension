import { browser } from 'webextension-polyfill-ts';

document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settingsButton');

    if (settingsButton) {
        settingsButton.replaceWith(settingsButton.cloneNode(true));

        document.getElementById('settingsButton')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                await browser.tabs.create({
                    url: browser.runtime.getURL('settings.html')
                });
            } catch (error) {
                console.error('Erreur lors de l\'ouverture des paramètres:', error);
            }

            window.close();
        }, { once: true });
    }
});
/**
 * Recalcule la position des messages dans le chat quand un message change de taille.
 * Cette fonction gère deux aspects importants :
 * 1. Ajuste la position du message modifié pour éviter que les badges soient coupés
 * 2. Repositionne tous les messages au-dessus pour maintenir l'espacement correct
 *
 * @param messageContainer Le conteneur du message qui a été modifié
 */
export function forceReflow(messageContainer?: HTMLElement) {
    if (!messageContainer) return;

    // Trouve le span parent (listitem) du message modifié
    const modifiedSpan = messageContainer.closest<HTMLElement>('[role="listitem"]');
    if (!modifiedSpan) return;

    // Trouve le conteneur interne du message pour obtenir sa nouvelle hauteur totale
    const innerDiv = modifiedSpan.querySelector<HTMLElement>('.sc-leYdVB');
    if (innerDiv) {
        // Calcule la différence de hauteur entre l'ancienne et la nouvelle taille
        const oldHeight = parseInt(modifiedSpan.style.height);
        const newHeight = innerDiv.offsetHeight;
        const heightDifference = newHeight - oldHeight;

        // Met à jour la hauteur du span parent pour accommoder tout le contenu
        modifiedSpan.style.height = `${newHeight}px`;

        // Important : Remonte légèrement le message modifié lui-même
        // pour éviter que les badges soient coupés
        const currentTop = parseInt(modifiedSpan.style.top);
        modifiedSpan.style.top = `${currentTop - heightDifference}px`;
    }

    // Trouve tous les messages dans le chat pour les repositionner
    const chatContainer = document.querySelector('[data-test="chatMessages"]');
    if (!chatContainer) return;

    const allMessages = Array.from(chatContainer.querySelectorAll<HTMLElement>('[role="listitem"]'));
    const modifiedIndex = allMessages.indexOf(modifiedSpan);

    // Repositionne tous les messages au-dessus en cascade
    for (let i = modifiedIndex - 1; i >= 0; i--) {
        const messageSpan = allMessages[i];
        const messageBelow = allMessages[i + 1];
        // La nouvelle position est calculée à partir de la position du message du dessous
        const newTop = parseInt(messageBelow.style.top) - messageSpan.offsetHeight;
        messageSpan.style.top = `${newTop}px`;
    }
}
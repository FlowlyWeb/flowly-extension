// Importations nécessaires pour tout le système
import { ActiveUser, UserMessage, ActiveUsersResponse } from "../../types/activeUsers";
import { ReactionData, WebSocketMessage, ReactionUpdateData } from "../../types/reactions";
import { getActualUserName } from "@/modules/users/user.module";

type ModuleSubscriber = {
    messageTypes: string[];
    handlers: Map<string, (data: any) => void>;
};

/**
 * Gestionnaire WebSocket centralisé amélioré
 * Gère toutes les communications WebSocket de l'application de manière unifiée
 */
class WebSocketManager {
    private static instance: WebSocketManager;
    private ws?: WebSocket;
    private subscribers: Map<string, ModuleSubscriber> = new Map();
    private reconnectAttempts = 0;
    private heartbeatInterval?: NodeJS.Timeout;
    private cleanupInterval?: NodeJS.Timeout;
    private messageQueue: any[] = [];
    private isRegistered = false;
    private activeUsers: Map<string, ActiveUser> = new Map();
    private reactions: Map<string, Map<string, string[]>> = new Map();
    private githubContributors: any[] = [];

    // Configuration unifiée
    private readonly config = {
        wsUrl: 'wss://api-beta.theovilain.com/ws',
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        heartbeatInterval: 5000,
        cleanupInterval: 5000,
        userTimeout: 15000
    };

    private constructor() {
        this.initialize();
    }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    /**
     * Initialise le système WebSocket avec toutes ses composantes
     */
    private initialize(): void {
        this.initializeWebSocket();
        this.setupHeartbeat();
        this.setupCleanupInterval();
    }

    /**
     * Initialise la connexion WebSocket avec gestion complète des événements
     */
    private initializeWebSocket(): void {
        if (this.ws?.readyState === WebSocket.OPEN ||
            this.ws?.readyState === WebSocket.CONNECTING) {
            return;
        }

        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.sendRegisterMessage();
            this.processQueue();
        };

        this.ws.onmessage = this.handleMessage.bind(this);

        this.ws.onclose = (event) => {
            this.isRegistered = false;
            this.handleReconnection();
        };

        this.ws.onerror = (error) => {
            this.handleReconnection();
        };
    }

    /**
     * Gère la logique de reconnexion en cas de perte de connexion
     * Utilise une stratégie de backoff exponentiel pour éviter de surcharger le serveur
     */
    private handleReconnection(): void {
        // Vérifie qu'on n'a pas dépassé le nombre maximum de tentatives
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;

            // Calcul du délai avec backoff exponentiel
            const delay = this.config.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

            console.log(
                `[WebSocketManager] Attempting to reconnect `+
                `(${this.reconnectAttempts}/${this.config.maxReconnectAttempts}) `+
                `in ${delay}ms`
            );

            // Programme la tentative de reconnexion
            setTimeout(() => {
                // Vérifie que la connexion n'a pas été rétablie entre temps
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    this.initializeWebSocket();
                }
            }, delay);
        } else {
            console.error(
                '[WebSocketManager] Max reconnection attempts reached. '+
                'Please refresh the page or check your connection.'
            );
        }
    }

    /**
     * Gère la réception et la distribution des messages
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'update_reactions':
                    this.handleReactionUpdate(data);
                    break;
                case 'activeUsers':
                case 'userLists':
                case 'userListsUpdate':
                    this.handleActiveUsersUpdate(data);
                    break;
                case 'pong':
                    this.handlePong();
                    break;
                case 'error':
                    console.error('[WebSocketManager] Server error:', data.message);
                    break;
            }

            // Distribution aux abonnés
            this.subscribers.forEach(subscriber => {
                if (subscriber.messageTypes.includes(data.type)) {
                    const handler = subscriber.handlers.get(data.type);
                    if (handler) handler(data);
                }
            });

        } catch (error) {
            console.error('[WebSocketManager] Error handling message:', error);
        }
    }

    /**
     * Configuration du heartbeat et nettoyage périodique
     */
    private setupHeartbeat(): void {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                const username = getActualUserName();
                const sessionId = this.getSessionId();

                this.send({
                    type: 'heartbeat',
                    username,
                    sessionId
                });
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Configuration du nettoyage périodique des ressources
     */
    private setupCleanupInterval(): void {
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);

        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let hasChanges = false;

            // Nettoyage des utilisateurs inactifs
            Array.from(this.activeUsers.entries()).forEach(([key, user]) => {
                if (now - user.lastSeen > this.config.userTimeout) {
                    this.activeUsers.delete(key);
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                this.notifyActiveUsersUpdate();
            }
        }, this.config.cleanupInterval);
    }

    /**
     * Gestion de l'enregistrement initial
     */
    private sendRegisterMessage(): void {
        if (this.isRegistered) return;

        const username = getActualUserName();
        const sessionId = this.getSessionId();

        if (username && sessionId) {
            this.send({
                type: 'register',
                username,
                sessionId
            });
            this.isRegistered = true;

            // Demande initiale des listes
            this.requestActiveUsers();
        }
    }

    /**
     * Gestion des mises à jour de réactions
     */
    private handleReactionUpdate(data: ReactionData): void {
        try {
            const reactionData = JSON.parse(data.data.reactions);
            this.reactions = new Map(Object.entries(reactionData).map(
                ([messageId, reactions]) => [
                    messageId,
                    new Map(Object.entries(reactions as Record<string, string[]>))
                ]
            ));
        } catch (error) {
            console.error('[WebSocketManager] Error updating reactions:', error);
        }
    }

    /**
     * Gestion des mises à jour des utilisateurs actifs
     */
    private handleActiveUsersUpdate(data: ActiveUsersResponse): void {
        this.activeUsers.clear();

        if ('payload' in data && data.payload?.data?.users) {
            data.payload.data.users.forEach(user => {
                this.activeUsers.set(user.name, user);
            });
        } else if (data.data?.users) {
            data.data.users.forEach(user => {
                this.activeUsers.set(user.name, user);
            });
        }

        if ('githubContributors' in data) {
            this.githubContributors = data.githubContributors || [];
        }

        this.notifyActiveUsersUpdate();
    }

    /**
     * Gestion du pong serveur
     */
    private handlePong(): void {
        this.requestActiveUsers();
    }

    /**
     * Interface publique pour l'ajout de réactions
     */
    public addReaction(messageId: string, emoji: string): void {
        const username = getActualUserName();
        if (!username) return;

        const sessionId = this.getSessionId();
        const message = {
            type: 'reaction_update',
            sessionToken: sessionId,
            data: {
                messageId,
                emoji,
                userId: username,
                action: this.getReactionAction(messageId, emoji, username)
            }
        };

        this.send(message);
    }

    /**
     * Détermine l'action de réaction (ajout ou suppression)
     */
    private getReactionAction(messageId: string, emoji: string, userId: string): 'add' | 'remove' {
        const messageReactions = this.reactions.get(messageId);
        const users = messageReactions?.get(emoji) || [];
        return users.includes(userId) ? 'remove' : 'add';
    }

    /**
     * Demande la liste des utilisateurs actifs
     */
    private requestActiveUsers(): void {
        this.send({ type: 'getUserLists' });
    }

    /**
     * Notifie les abonnés des changements d'utilisateurs actifs
     */
    private notifyActiveUsersUpdate(): void {
        const subscribers = this.subscribers.get('activeUsers');
        if (subscribers) {
            const data = {
                type: 'activeUsers',
                users: Array.from(this.activeUsers.values()),
                githubContributors: this.githubContributors
            };
            subscribers.handlers.get('activeUsers')?.(data);
        }
    }

    /**
     * Inscription d'un module aux événements
     */
    public subscribe(moduleId: string, messageTypes: string[], handlers: Map<string, (data: any) => void>): void {
        this.subscribers.set(moduleId, { messageTypes, handlers });
    }

    /**
     * Désinscription d'un module
     */
    public unsubscribe(moduleId: string): void {
        this.subscribers.delete(moduleId);
    }

    /**
     * Envoi sécurisé de messages
     */
    public send(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
            this.initializeWebSocket();
        }
    }

    /**
     * Gestion de la file d'attente des messages
     */
    private processQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (message) this.send(message);
        }
    }

    /**
     * Obtention de l'ID de session
     */
    getSessionId(): string {
        const sessionTitle = document.querySelector('[data-test="presentationTitle"]')?.textContent;
        if (!sessionTitle) return 'unknown-session';

        const generateHash = (str: string): string => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return (hash >>> 0).toString(16).slice(-8);
        };

        return generateHash(`Flowly_2024${sessionTitle}`);
    }

    /**
     * Nettoyage des ressources
     */
    public cleanup(isRefresh: boolean = false): void {
        const username = getActualUserName();
        const sessionId = this.getSessionId();

        if (username && sessionId && this.ws?.readyState === WebSocket.OPEN) {
            this.send({
                type: 'unregister',
                username,
                sessionId
            });
        }

        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);

        if (this.ws) {
            this.ws.close(1000, isRefresh ? 'Page refresh' : 'Cleanup');
        }

        this.subscribers.clear();
        this.messageQueue = [];
        this.activeUsers.clear();
        this.reactions.clear();
        this.isRegistered = false;
    }
}

// Export de l'instance unique
export const wsManager = WebSocketManager.getInstance();
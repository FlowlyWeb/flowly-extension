import { ActiveUser, ActiveUsersResponse } from "../../types/activeUsers";
import { ReactionData } from "../../types/reactions";
import { getActualUserName } from "../modules/users/user.module";

type ModuleSubscriber = {
    messageTypes: string[];
    handlers: Map<string, (data: any) => void>;
};

/**
 * WebSocketManager
 * Handles the WebSocket connection and communication
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

    private readonly config = {
        wsUrl: 'wss://ws.flowlyweb.com/',
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
     * Initialization of the WebSocket manager
     */
    private initialize(): void {
        this.initializeWebSocket();
        this.setupHeartbeat();
        this.setupCleanupInterval();
    }

    /**
     * Initialization of the WebSocket connection
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
     * Handles the reconnection strategy
     * Uses exponential backoff to reconnect
     */
    private handleReconnection(): void {

        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;

            const delay = this.config.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

            setTimeout(() => {
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
     * Handles incoming messages from the WebSocket
     */
    private handleMessage(event: MessageEvent): void {

        try {
            const data = JSON.parse(event.data);
            console.log('[WebSocketManager] Received message:', data);

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
                case 'warning':
                    this.handleWarningMessage(data);
                    break;
                case 'error':
                    console.error('[WebSocketManager] Server error:', data.message);
                    break;
            }

            console.log('[WebSocketManager] Notifying subscribers, total:', this.subscribers.size);
            this.subscribers.forEach((subscriber, key) => {
                console.log('[WebSocketManager] Checking subscriber:', key, 'for message type:', data.type, 'subscriber messageTypes:', subscriber.messageTypes);
                if (subscriber.messageTypes.includes(data.type)) {
                    const handler = subscriber.handlers.get(data.type);
                    console.log('[WebSocketManager] Found handler for', data.type, 'in subscriber:', key);
                    if (handler) {
                        console.log('[WebSocketManager] Calling handler for', data.type);
                        handler(data);
                    }
                }
            });

        } catch (error) {
            console.error('[WebSocketManager] Error handling message:', error);
        }
    }

    /**
     * Heartbeat configuration
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
     * Cleanup interval configuration
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
     * Handles the registration message
     */
    private sendRegisterMessage(retryCount = 0): void {
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

            this.requestActiveUsers();
            this.requestReactions();
        } else if (retryCount < 10) {
            setTimeout(() => this.sendRegisterMessage(retryCount + 1), 1000);
        }
    }

    /**
     * Ask for reactions
     */
    private requestReactions(): void {
        this.send({ type: 'getReactions' });
    }

    /**
     * Handles incoming warning messages
     */
    private handleWarningMessage(data: any): void {

        const warningSubscribers = Array.from(this.subscribers.values())
            .filter(sub => sub.messageTypes.includes('warning'))
            .map(sub => sub.handlers.get('warning'))
            .filter(Boolean);

        warningSubscribers.forEach(handler => handler?.(data));
    }

    /**
     * Send a warning through WebSocket
     * @param sessionId Session identifier
     * @param userId User identifier
     * @param problemType Type of problem
     */
    public sendWarning(sessionId: string, userId: string, problemType: string): void {
        const message = {
            type: 'warning',
            sessionToken: sessionId,
            data: {
                userId,
                problemType,
                timestamp: Date.now()
            }
        };
        this.send(message);
    }

    public sendPause(sessionId: string, userId: string, duration: number, reason?: string): void {
        const endTime = new Date(Date.now() + duration * 60000);
        const message = {
            type: 'pause',
            sessionToken: sessionId,
            data: {
                userId,
                duration,
                reason,
                startTime: Date.now(),
                endTime: endTime.getTime(),
                endTimeFormatted: endTime.toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })
            }
        };
        
        console.log('[WebSocketManager] Sending pause message:', message);
        this.send(message);
        console.log('[WebSocketManager] Pause message sent via WebSocket');
    }

    /**
     * Handles the reaction update
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
     * Handles the active users update
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
     * Handles the pong message
     */
    private handlePong(): void {
        this.requestActiveUsers();
    }

    /**
     * Public interface to add a reaction
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
     * Determines the action to take for a reaction
     */
    private getReactionAction(messageId: string, emoji: string, userId: string): 'add' | 'remove' {
        const messageReactions = this.reactions.get(messageId);
        const users = messageReactions?.get(emoji) || [];
        return users.includes(userId) ? 'remove' : 'add';
    }

    /**
     * Ask for active users
     */
    private requestActiveUsers(): void {
        this.send({ type: 'getUserLists' });
    }

    /**
     * Notify active users update
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
     * Module subscription
     */
    public subscribe(moduleId: string, messageTypes: string[], handlers: Map<string, (data: any) => void>): void {
        this.subscribers.set(moduleId, { messageTypes, handlers });
    }

    /**
     * Send a message through the WebSocket
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
     * Process the message queue
     */
    private processQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (message) this.send(message);
        }
    }

    /**
     * Get the session ID
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
     * Cleanup the WebSocket connection
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

export const wsManager = WebSocketManager.getInstance();
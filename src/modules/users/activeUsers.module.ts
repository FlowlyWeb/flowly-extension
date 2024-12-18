import {
    ActiveUser,
    GithubContributor,
    ActiveUsersResponse,
    UserWebSocketMessage,
    activeUserConfig, RegisterUserMessage, GetUsersMessage, UnregisterUserMessage, UserMessage
} from "../../../types/activeUsers";
import { getActualUserName } from "./user.module";

/**
 * ActiveUserManager class
 */
class ActiveUserManager {

    private static instance: ActiveUserManager;
    private messageQueue: UserWebSocketMessage[] = [];
    private ws?: WebSocket;
    private reconnectAttempts = 0;
    private heartbeatInterval?: ReturnType<typeof setInterval>;
    private activeUsers: Map<string, ActiveUser> = new Map();
    private githubContributors: GithubContributor[] = [];
    private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
    private updateInterval?: ReturnType<typeof setInterval>;
    private readonly HEARTBEAT_INTERVAL = 30000;

    // Settings for websocket connection
    private readonly config: activeUserConfig = {
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        checkInterval: 1000,
        wsUrl: 'wss://api.theovilain.com/active-users'
    };

    // Empty constructor to prevent instantiation
    private constructor() {}

    /**
     * Singleton instance getter
     * @public
     * @returns ActiveUserManager instance
     */
    public static getInstance(): ActiveUserManager {
        if (!ActiveUserManager.instance) {
            ActiveUserManager.instance = new ActiveUserManager();
        }
        return ActiveUserManager.instance;
    }

    /**
     * Setup method
     * @public
     */
    public setup(): void {
        console.log('[Flowly] Initializing active users module');
        this.initializeWebSocket();
        this.setupHeartbeat();

        setTimeout(() => {
            this.registerCurrentUser();
            this.startPeriodicUpdates();
        }, 1000);
    }

    /**
     * Initialize WebSocket connection
     * @private
     */
    private initializeWebSocket(): void {
        this.ws = new WebSocket(this.config.wsUrl);
        this.setupWebSocketHandlers();
    }

    /**
     * Setup WebSocket event handlers
     * @private
     */
    private setupWebSocketHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.processQueue();
            this.requestActiveUsers();
        };

        this.ws.onmessage = this.handleWebSocketMessage.bind(this);
        this.ws.onclose = () => this.handleReconnection();
        this.ws.onerror = (error) => {
            this.handleReconnection();
        };
    }

    /**
     * Setup heartbeat interval
     * @private
     */
    private setupHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    /**
     * Handle reconnection attempts
     * @private
     */
    private handleReconnection(): void {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.initializeWebSocket(), this.config.reconnectDelay);
        } else {
            console.error('[Flowly] Max reconnection attempts reached');
        }
    }

    /**
     * Start periodic updates for active users
     * @private
     */
    private startPeriodicUpdates(): void {
        this.requestActiveUsers();

        this.updateInterval = setInterval(() => {
            this.requestActiveUsers();
        }, this.UPDATE_INTERVAL);
    }

    /**
     * Register current user as an active user on the server
     * @private
     */
    private registerCurrentUser(): void {
        const username = getActualUserName();
        const sessionId = this.getSessionId();

        if (username && sessionId) {
            const message: UserMessage = {
                type: 'register',
                username,
                sessionId
            };
            this.sendMessage(message);
        }
    }

    /**
     * Get session ID based on the current session title
     * @private
     * @returns Session ID
     */
    private getSessionId(): string {
        const sessionTitle = document.querySelector('[data-test="presentationTitle"]')?.textContent;
        if (!sessionTitle) {
            return 'unknown-session';
        }

        const generateHash = (str: string): string => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return (hash >>> 0).toString(16).slice(-8);
        };

        const SALT = "Flowly_2024";
        return generateHash(`${SALT}${sessionTitle}`);
    }

    /**
     * Handle WebSocket message
     * @param event MessageEvent
     * @private
     */
    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data) as UserWebSocketMessage;

            switch (data.type) {
                case 'userLists':
                case 'userListsUpdate':
                case 'activeUsers':
                    this.updateActiveUsers(data);
                    break;
                case 'error':
                case 'registerUserError':
                case 'getUserListsError':
                    console.error('[Flowly] Server error:', data.payload?.error || data.message);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('[Flowly] Error handling WebSocket message:', error);
        }
    }

    /**
     * Update active users list
     * @param data ActiveUsersResponse
     * @private
     */
    private updateActiveUsers(data: ActiveUsersResponse): void {
        this.activeUsers.clear();

        if ('payload' in data && data.payload?.data?.users) {
            data.payload.data.users.forEach(user => {
                this.activeUsers.set(user.name, {
                    name: user.name,
                    lastSeen: user.lastSeen,
                    sessionId: user.id
                });
            });
        }
        else if (data.data?.users) {
            data.data.users.forEach(user => {
                this.activeUsers.set(user.name, {
                    name: user.name,
                    lastSeen: user.lastSeen,
                    sessionId: user.id
                });
            });
        }
        else if (data.users) {
            data.users.forEach(username => {
                this.activeUsers.set(username, {
                    name: username,
                    lastSeen: Date.now(),
                    sessionId: this.getSessionId()
                });
            });
        }
        else {
            console.warn('[Flowly] No users data found in response:', data);
        }

        if ('payload' in data && data.payload?.data?.collaborators) {
            this.githubContributors = data.payload.data.collaborators;
        }
        else if (data.githubContributors) {
            this.githubContributors = data.githubContributors;
        }
    }

    /**
     * Send message to WebSocket server
     * @param message UserWebSocketMessage
     * @param timeout Timeout in milliseconds
     * @private
     * @returns Promise
     */
    private async sendMessage(message: UserWebSocketMessage, timeout: number = 5000): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.messageQueue.push(message);
            return;
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('WebSocket message timeout'));
            }, timeout);

            try {
                this.ws!.send(JSON.stringify(message));
                clearTimeout(timeoutId);
                resolve();
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
                this.messageQueue.push(message);
            }
        });
    }

    /**
     * Process message queue
     * @private
     * @returns Promise
     */
    private async processQueue(): Promise<void> {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const message = this.messageQueue.shift();
            if (message) {
                try {
                    await this.sendMessage(message);
                } catch (error) {
                    this.messageQueue.unshift(message);
                    break;
                }
            }
        }
    }

    /**
     * Request active users from the server
     * @private
     */
    private requestActiveUsers(): void {
        const message: GetUsersMessage = {
            type: 'getUserLists'
        };
        this.sendMessage(message);
    }

    /**
     * Normalize full name for comparison
     * @param name string
     * @returns Normalized full name
     * @private
     */
    private normalizeFullName(name: string): string {

        if (!name) return '';

        return name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');
    }

    /**
     * Get user status based on full name
     * @param fullName string
     * @returns User status ('active', 'contributor', 'none')
     */
    public getUserStatus(fullName: string): 'active' | 'contributor' | 'none' {
        const normalizedName = this.normalizeFullName(fullName);

        if (this.githubContributors) {
            const isContributor = this.githubContributors.some(contributor =>
                this.normalizeFullName(contributor.name) === normalizedName
            );

            if (isContributor) {
                return 'contributor';
            }
        }

        const isActive = this.activeUsers.has(fullName);

        if (isActive) {
            return 'active';
        }

        return 'none';
    }

    /**
     * Cleanup method to close WebSocket connection
     * @param isRefresh boolean
     */
    public cleanup(isRefresh: boolean = false): void {
        if (this.ws) {
            const username = getActualUserName();
            const sessionId = this.getSessionId();

            if (username && sessionId) {
                const message: UnregisterUserMessage = {
                    type: 'unregisterUser',
                    payload: {
                        id: sessionId,
                        name: username
                    }
                };

                try {
                    this.ws.send(JSON.stringify(message));
                } catch (error) {
                    console.error('[Flowly] Error sending unregister message:', error);
                }
            }

            this.ws.close(1000, isRefresh ? 'Page refresh' : 'Cleanup');
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

export const activeUserManager = ActiveUserManager.getInstance();
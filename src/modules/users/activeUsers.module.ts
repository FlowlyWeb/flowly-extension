import {
    ActiveUser,
    GithubContributor,
    UserMessage,
    ActiveUsersResponse,
    UserWebSocketMessage,
    activeUserConfig
} from "../../../types/activeUsers";
import { getActualUserName } from "./user.module";

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

    private readonly config: activeUserConfig = {
        maxReconnectAttempts: 5,
        reconnectDelay: 3000,
        checkInterval: 1000,
        wsUrl: 'ws://localhost:3000/active-users'
    };

    private constructor() {}

    public static getInstance(): ActiveUserManager {
        if (!ActiveUserManager.instance) {
            ActiveUserManager.instance = new ActiveUserManager();
        }
        return ActiveUserManager.instance;
    }

    public setup(): void {
        console.log('[WWSNB] Initializing active users module');
        this.initializeWebSocket();
        this.setupHeartbeat();
        this.registerCurrentUser();
        this.startPeriodicUpdates();
    }

    private initializeWebSocket(): void {
        this.ws = new WebSocket(this.config.wsUrl);
        this.setupWebSocketHandlers();
    }

    private setupWebSocketHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('[WWSNB] WebSocket connected for Active Users Module');
            this.reconnectAttempts = 0;
            this.processQueue();
            this.requestActiveUsers();
        };

        this.ws.onmessage = this.handleWebSocketMessage.bind(this);
        this.ws.onclose = () => this.handleReconnection();
        this.ws.onerror = (error) => {
            console.error('[WWSNB] WebSocket error:', (error as ErrorEvent).message);
            this.handleReconnection();
        };
    }

    private setupHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    private handleReconnection(): void {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.initializeWebSocket(), this.config.reconnectDelay);
        } else {
            console.error('[WWSNB] Max reconnection attempts reached');
        }
    }

    private startPeriodicUpdates(): void {
        this.requestActiveUsers();

        this.updateInterval = setInterval(() => {
            this.requestActiveUsers();
        }, this.UPDATE_INTERVAL);
    }

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

    private getSessionId(): string {
        const sessionTitle = document.querySelector('[data-test="presentationTitle"]')?.textContent;
        if (!sessionTitle) {
            console.error('[WWSNB] Session not found');
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

        const SALT = "WWSNB_2024";
        return generateHash(`${SALT}${sessionTitle}`);
    }

    private handleWebSocketMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data) as UserWebSocketMessage;

            switch (data.type) {
                case 'activeUsers':
                    this.updateActiveUsers(data);
                    break;
                case 'error':
                    console.error('[WWSNB] Server error:', data.message);
                    break;
                case 'pong':
                    // Do nothing
                    break;
                default:
                    console.warn('[WWSNB] Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('[WWSNB] Error handling WebSocket message:', error);
        }
    }

    private updateActiveUsers(data: ActiveUsersResponse): void {
        // Mise à jour de la Map des utilisateurs actifs
        this.activeUsers.clear();
        data.users.forEach(username => {
            this.activeUsers.set(username, {
                name: username,
                lastSeen: Date.now(),
                sessionId: this.getSessionId()
            });
        });

        this.githubContributors = data.githubContributors;
    }

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

    private requestActiveUsers(): void {
        const message: UserMessage = {
            type: 'getUsers',
        };
        this.sendMessage(message);
    }

    private normalizeFullName(name: string): string {

        if (!name) return '';

        return name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, '');
    }

    public getUserStatus(fullName: string): 'active' | 'contributor' | 'none' {
        const normalizedName = this.normalizeFullName(fullName);

        if (this.githubContributors) {
            for (const contributor of this.githubContributors) {
                if (this.normalizeFullName(contributor.firstname + ' ' + contributor.name) === normalizedName) {
                    return 'contributor';
                }
            }
        }

        // Utiliser directement le Map
        const isActive = this.activeUsers.has(fullName);

        if (isActive) {
            return 'active';
        }

        return 'none';
    }

    public cleanup(isRefresh: boolean = false): void {
        if (this.ws) {
            const username = getActualUserName();
            const sessionId = this.getSessionId();

            if (username && sessionId) {
                const message: UserMessage = {
                    type: 'unregister',
                    username,
                    sessionId
                };

                try {
                    this.ws.send(JSON.stringify(message));
                } catch (error) {
                    console.error('[WWSNB] Error sending unregister message:', error);
                }
            }

            this.ws.close(1000, isRefresh ? 'Page refresh' : 'Cleanup');
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

export const activeUserManager = ActiveUserManager.getInstance();
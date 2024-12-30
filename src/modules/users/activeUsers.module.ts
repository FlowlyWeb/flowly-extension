import { wsManager } from "@/managers/websocket.manager";
import type {
    ActiveUser,
    ActiveUsersResponse,
    GithubContributor
} from "../../../types/activeUsers";

/**
 * Handles active user management
 */
class ActiveUserManager {
    private static instance: ActiveUserManager;
    private activeUsers: Map<string, ActiveUser> = new Map();
    private githubContributors: GithubContributor[] = [];
    private updateInterval?: ReturnType<typeof setInterval>;
    private readonly UPDATE_INTERVAL = 10 * 1000; // 10 seconds

    private constructor() {
        this.setup();
    }

    public static getInstance(): ActiveUserManager {
        if (!ActiveUserManager.instance) {
            ActiveUserManager.instance = new ActiveUserManager();
        }
        return ActiveUserManager.instance;
    }

    /**
     * Init the active user manager
     */
    public setup(): void {
        console.log('[Flowly] Initializing active users module');

        wsManager.subscribe('activeUsers', ['activeUsers', 'userLists', 'userListsUpdate', 'pong'], new Map([
            ['activeUsers', this.updateActiveUsers.bind(this)],
            ['userLists', this.updateActiveUsers.bind(this)],
            ['userListsUpdate', this.updateActiveUsers.bind(this)],
            ['pong', () => this.requestActiveUsers()]
        ]));

        this.startPeriodicUpdates();
    }

    /**
     * Start periodic updates to get active users
     * @private
     */
    private startPeriodicUpdates(): void {
        this.requestActiveUsers();

        this.updateInterval = setInterval(() => {
            this.requestActiveUsers();
        }, this.UPDATE_INTERVAL);
    }

    /**
     * Request active users from the server
     * @private
     */
    private requestActiveUsers(): void {
        wsManager.send({
            type: 'getUserLists'
        });
    }

    /**
     * Update the active users list
     * @param data
     * @private
     */
    private updateActiveUsers(data: ActiveUsersResponse): void {
        this.activeUsers.clear();

        if ('payload' in data && data.payload?.data?.users) {
            data.payload.data.users.forEach(user => {
                this.activeUsers.set(user.name, user);
            });
        }
        else if (data.data?.users) {
            data.data.users.forEach(user => {
                this.activeUsers.set(user.name, user);
            });
        }
        else if (data.users) {
            data.users.forEach(username => {
                this.activeUsers.set(username, {
                    name: username,
                    lastSeen: Date.now(),
                    sessionId: wsManager.getSessionId()
                });
            });
        }

        if ('payload' in data && data.payload?.data?.collaborators) {
            this.githubContributors = data.payload.data.collaborators;
        }
        else if (data.githubContributors) {
            this.githubContributors = data.githubContributors;
        }
    }

    /**
     * Normalize the full name of a user
     * @param name
     * @private
     */
    private normalizeFullName(name: string): string {
        if (!name) return '';

        return name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Delete accents
            .replace(/[^a-z0-9]/g, '');      // Only keep alphanumeric characters
    }

    /**
     * Get the status of a user
     * @param fullName
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
     * Cleanup the active user manager
     * @param isRefresh
     */
    public cleanup(isRefresh: boolean = false): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

export const activeUserManager = ActiveUserManager.getInstance();
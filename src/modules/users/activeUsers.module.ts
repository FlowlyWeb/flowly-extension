import { wsManager } from "@/managers/websocket.manager";
import type {
    ActiveUser,
    ActiveUsersResponse,
    GithubContributor
} from "../../../types/activeUsers";

/**
 * Gère le suivi des utilisateurs actifs dans une session
 * Utilise le pattern Singleton et délègue la communication WebSocket au gestionnaire centralisé
 */
class ActiveUserManager {
    private static instance: ActiveUserManager;
    private activeUsers: Map<string, ActiveUser> = new Map();
    private githubContributors: GithubContributor[] = [];
    private updateInterval?: ReturnType<typeof setInterval>;
    private readonly UPDATE_INTERVAL = 10 * 1000; // 10 secondes

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
     * Initialise le gestionnaire d'utilisateurs actifs
     * Configure les abonnements WebSocket et démarre les mises à jour périodiques
     */
    public setup(): void {
        console.log('[Flowly] Initializing active users module');

        // S'abonne aux mises à jour des utilisateurs actifs
        wsManager.subscribe('activeUsers', ['activeUsers', 'userLists', 'userListsUpdate', 'pong'], new Map([
            ['activeUsers', this.updateActiveUsers.bind(this)],
            ['userLists', this.updateActiveUsers.bind(this)],
            ['userListsUpdate', this.updateActiveUsers.bind(this)],
            ['pong', () => this.requestActiveUsers()]
        ]));

        this.startPeriodicUpdates();
    }

    private startPeriodicUpdates(): void {
        this.requestActiveUsers();

        this.updateInterval = setInterval(() => {
            this.requestActiveUsers();
        }, this.UPDATE_INTERVAL);
    }

    private requestActiveUsers(): void {
        wsManager.send({
            type: 'getUserLists'
        });
    }

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

    private normalizeFullName(name: string): string {
        if (!name) return '';

        return name.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
            .replace(/[^a-z0-9]/g, '');      // Ne garde que les caractères alphanumériques
    }

    /**
     * Détermine le statut d'un utilisateur en vérifiant s'il est actif ou contributeur
     * @param fullName Nom complet de l'utilisateur
     * @returns Le statut de l'utilisateur ('active', 'contributor', ou 'none')
     */
    public getUserStatus(fullName: string): 'active' | 'contributor' | 'none' {
        const normalizedName = this.normalizeFullName(fullName);

        // Vérifie d'abord si l'utilisateur est un contributeur GitHub
        if (this.githubContributors) {
            const isContributor = this.githubContributors.some(contributor =>
                this.normalizeFullName(contributor.name) === normalizedName
            );

            if (isContributor) {
                return 'contributor';
            }
        }

        // Vérifie ensuite si l'utilisateur est actif
        const isActive = this.activeUsers.has(fullName);

        if (isActive) {
            return 'active';
        }

        return 'none';
    }

    /**
     * Nettoie les ressources lors de la fermeture
     * @param isRefresh Indique si le nettoyage est dû à un rafraîchissement de page
     */
    public cleanup(isRefresh: boolean = false): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

export const activeUserManager = ActiveUserManager.getInstance();
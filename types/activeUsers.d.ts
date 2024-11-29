export interface activeUserConfig {
    maxReconnectAttempts: number;
    reconnectDelay: number;
    checkInterval: number;
    wsUrl: string;
}

export interface ActiveUser {
    name: string;
    lastSeen: number;
    sessionId: string;
}

export interface GithubContributor {
    id: number;
    created_at: string;
    firstname: string;
    name: string;
    github_username: string;
}

export interface UserMessage {
    type: 'register' | 'unregister' | 'getUsers' | 'pong';
    username?: string;
    sessionId?: string;
}

export interface ActiveUsersResponse {
    type: 'activeUsers';
    users: string[];
    githubContributors: GithubContributor[];
}

export interface ErrorResponse {
    type: 'error';
    message: string;
}

export type UserWebSocketMessage =
    | UserMessage
    | ActiveUsersResponse
    | ErrorResponse;
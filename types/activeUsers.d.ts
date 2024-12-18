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

export interface RegisterUserMessage {
    type: 'registerUser';
    payload: {
        id: string;
        name: string;
    };
}

export interface UnregisterUserMessage {
    type: 'unregisterUser';
    payload: {
        id: string;
        name: string;
    };
}

export interface GetUsersMessage {
    type: 'getUserLists';
}

export interface HeartbeatMessage {
    type: 'heartbeat';
}

export interface ActiveUsersResponse {
    type: 'userLists' | 'userListsUpdate' | 'activeUsers';
    data?: {
        users: Array<{
            id: string;
            name: string;
            lastSeen: number;
        }>;
        collaborators: Array<{
            id: string;
            name: string;
            lastSeen: number;
        }>;
    };
    users?: string[];
    githubContributors?: GithubContributor[];
    payload?: {
        success: boolean;
        data: {
            users: Array<{
                id: string;
                name: string;
                lastSeen: number;
            }>;
            collaborators: Array<any>;
        };
    };
}

export interface RegisterUserSuccessResponse {
    type: 'registerUserSuccess';
    payload: {
        success: boolean;
        user: {
            id: string;
            name: string;
        };
    };
}

export interface ErrorResponse {
    type: 'error' | 'registerUserError' | 'getUserListsError';
    payload?: {
        success: false;
        error: string;
    };
    message?: string;
}

export interface UserMessage {
    type: 'register' | 'unregister' | 'getUsers';
    username?: string;
    sessionId?: string;
}

export type UserWebSocketMessage =
    | RegisterUserMessage
    | UnregisterUserMessage
    | GetUsersMessage
    | HeartbeatMessage
    | ActiveUsersResponse
    | RegisterUserSuccessResponse
    | ErrorResponse
    | UserMessage;
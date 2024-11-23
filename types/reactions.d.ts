export interface ReactionConfig {
    maxReconnectAttempts: number;
    reconnectDelay: number;
    checkInterval: number;
    wsUrl: string;
}

export interface BaseWebSocketMessage<T extends string, D = unknown> {
    type: T;
    data?: D;
    sessionToken?: string;
}

export type ReactionUsers = string[];
export type MessageReaction = Map<string, ReactionUsers>;
export type MessageReactions = Map<string, MessageReaction>;

export interface ReactionData {
    type: 'update_reactions';
    sessionToken: string;
    reactions: string;
}

export interface ParsedReactionData {
    emoji: string;
    users: string[];
}

export interface ParsedMessageReaction {
    messageId: string;
    reactions: ParsedReactionData[];
}

export type AvailableReaction = '👍' | '❤️' | '😂' | '😮' | '😢' | '😡' | '🎉' | '🤔' | '👀' | '🔥' | '✨' | '👎';

export interface ReactionElements {
    reactionsWrapper: HTMLElement;
    reactionsContainer: HTMLElement;
}

export type WebSocketMessage =
    | BaseWebSocketMessage<'reaction_update', ReactionUpdateData>
    | BaseWebSocketMessage<'update_reactions', ReactionStateData>;

export interface ReactionUpdateData {
    messageId: string;
    emoji: string;
    userId: string;
    action: 'add' | 'remove';
}


export interface ReactionStateData {
    reactions: string;
}

export type QueuedMessage = WebSocketMessage;
declare global {
    interface Window {
        chatManager?: ChatManager;
    }
}

export interface MessageItem {
    id: string;
    sender: string;
    time: string;
    timestamp: number;
    content: string;
    isModerator: boolean;
    isSystem: boolean;
    isQuestion: boolean;
    isMention: boolean;
}
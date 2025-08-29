interface PauseState {
    isActive: boolean;
    selectedDuration: number | null;
    reason: string;
}

interface PauseDuration {
    id: string;
    label: string;
    minutes: number;
}

interface PauseModalElements {
    modal: HTMLElement;
    backdrop: HTMLElement;
    closeBtn: HTMLElement;
    cancelBtn: HTMLElement;
    confirmBtn: HTMLButtonElement;
    durationOptions: NodeListOf<HTMLElement>;
    customDurationDiv: HTMLElement;
    customInput: HTMLInputElement;
    reasonInput: HTMLTextAreaElement;
}
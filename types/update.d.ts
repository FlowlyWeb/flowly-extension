declare interface Version {
    current: string;
    latest: string | null;
    updateAvailable: boolean;
}

declare interface UpdateState {
    checking: boolean;
    downloading: boolean;
    error: string | null;
    lastCheck: number | null;
}

declare interface UpdateInfo {
    version: string;
    update_link: string;
    applications: {
        gecko: {
            strict_min_version: string;
        };
    };
}

declare interface UpdateResponse {
    addons: {
        [key: string]: {
            updates: UpdateInfo[];
        };
    };
}

declare interface UpdateCheckResult {
    updateAvailable: boolean;
    version?: string;
    error?: string;
}

declare interface InstallResult {
    success: boolean;
    error?: string;
}

declare interface UpdaterMessage {
    type: 'CHECK_UPDATES' | 'INSTALL_UPDATE' | 'GET_STATUS';
    payload?: any;
}

declare interface UpdaterStatus {
    state: UpdateState;
    version: Version;
}
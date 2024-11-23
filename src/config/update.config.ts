/**
 * Configuration for the update service
 */
export const UpdateConfig = {
    UPDATE_CHECK_INTERVAL: 60 * 60 * 1000, // 1 heure
    UPDATE_URL: 'https://api.theovilain.com/updates.json',
    EXTENSION_ID: 'wwsnb',
    MIN_CHECK_INTERVAL: 30 * 60 * 1000, // 30 minutes
} as const;
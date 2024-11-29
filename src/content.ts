import { setupMentions } from "./modules/mentions";
import { reactionManager } from "./modules/reactions";
import { activeUserManager} from "./modules/users/activeUsers.module";
import { checkNewMessages, observer } from "./utils/observer";

/**
 * Initialize all WWSNB modules
 */
const app = {
    // Configure observer settings
    config : {
        childList: true,
        subtree: true
    },

    init: ()=> {
        console.log('WWSNB by Théo Vilain successfully loaded');

        // Start observing document for changes
        observer.observe(document.body, app.config);
      
        // Initialize all modules with a slight delay to ensure DOM is ready
        setTimeout(() => {
            console.log('[WWSNB] Starting modules initialization');
            checkNewMessages();
            setupMentions();
            reactionManager.setup();
            activeUserManager.setup();
            console.log('[WWSNB] Modules initialized successfully');
        }, 1000);

        // Add cleanup handlers
        window.addEventListener('beforeunload', app.cleanup);
        window.addEventListener('unload', app.cleanup);

    },

    cleanup: (event?: BeforeUnloadEvent | Event) => {
        console.log('[WWSNB] Cleaning up...');

        const isRefresh = event?.type === 'beforeunload';

        observer.disconnect();
        reactionManager.cleanup(isRefresh);
        activeUserManager.cleanup(isRefresh);

        console.log('[WWSNB] Cleanup completed');
    }
}

// Launch the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
} else {
    app.init();
}
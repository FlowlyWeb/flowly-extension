import { setupMentions } from "./modules/mentions";
import { reactionManager } from "./modules/reactions";
import { activeUserManager} from "./modules/users/activeUsers.module";
import { warningManager } from "./modules/warning/warning.module";
import { wsManager } from "./managers/websocket.manager";
import { checkNewMessages, observer } from "./utils/observer";
import {resetModeratorCache} from "@/modules/users/user.module";
import {detachableManager} from "@/modules/detachable/detachable.module";

/**
 * Initialize all Flowly modules
 */
const app = {
    // Configure observer settings
    config : {
        childList: true,
        subtree: true
    },

    init: ()=> {

        const presentationTitle = document.querySelector('[data-test="presentationTitle"]');
        if (presentationTitle && presentationTitle.hasAttribute('data-flowly')) {
            console.log('[Flowly] Flowly integration detected, deactivation of the web extension');
            return;
        }


        console.log('Flowly by Théo Vilain successfully loaded');

        // Start observing document for changes
        observer.observe(document.body, app.config);
      
        // Initialize all modules with a slight delay to ensure DOM is ready
        setTimeout(() => {
            console.log('[Flowly] Starting modules initialization');
            checkNewMessages();
            setupMentions();
            reactionManager.setup();
            activeUserManager.setup();
            warningManager.setup();
            detachableManager.setup();
            console.log('[Flowly] Modules initialized successfully');
        }, 1000);

        // Add cleanup handlers
        window.addEventListener('beforeunload', app.cleanup);
        window.addEventListener('unload', app.cleanup);

    },

    cleanup: (event?: BeforeUnloadEvent | Event) => {
        console.log('[Flowly] Cleaning up...');

        const isRefresh = event?.type === 'beforeunload';

        observer.disconnect();
        reactionManager.cleanup(isRefresh);
        activeUserManager.cleanup(isRefresh);
        warningManager.cleanup(isRefresh);
        wsManager.cleanup(isRefresh);
        detachableManager.cleanup();

        resetModeratorCache();

        console.log('[Flowly] Cleanup completed');
    }
}

// Launch the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', app.init);
} else {
    app.init();
}
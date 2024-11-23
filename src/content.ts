import { setupMentions } from "./modules/mentions.js";
//import { setupReactions } from "./modules/reactions.js";
import { checkNewMessages, observer } from "./utils/observer.js";

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
        //setupReactions();
        console.log('[WWSNB] Modules initialized successfully');
    }, 1000);

    }
}
// Launch the application when DOM is ready
document.readyState === 'loading'? document.addEventListener('DOMContentLoaded', app.init) : app.init();
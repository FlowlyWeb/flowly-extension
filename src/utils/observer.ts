import { addClassMention } from "@/modules/mentions/mention.module";
import { getActualUserName } from "@/modules/users/user.module";
import { addClassModerator } from "@/modules/moderator";
import { addClassQuestion } from "@/modules/questions";

export const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
          checkNewMessages();
      }
  }
});


export function checkNewMessages() {
  console.log('[WWSNB] Start checking new messages for questions');
  // Get all messages using data-test attribute
  const messages = document.querySelectorAll('[data-test="chatUserMessageText"]') as unknown as HTMLElement[];
  const actualUserName = getActualUserName();

  for (const message of messages) {
    const textContent = message.textContent;

    /**
     * Check new messages for questions 
     */        
    if (textContent?.includes('@question')) addClassQuestion(message);
    /**
     * Check new messages for questions and mentions
     */
    if (textContent?.includes(`@${actualUserName}`)) addClassMention(message);
    /**
     * Check new messages for moderator messages
     */
    if (message.hasAttribute('moderator-checked')) {
      continue;
    }
    message.setAttribute('moderator-checked', 'true');
    
    // Look for moderator avatar
    const moderatorAvatar = message.querySelector('[data-test="moderatorAvatar"]');

    if (moderatorAvatar) addClassModerator(message);


  }
  console.log('[WWSNB] New messages checked');

}
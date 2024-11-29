import { checkForMentions } from "../modules/mentions/mention.module";
import { checkForModeratorMessages } from "../modules/moderators/moderator.module";
import { checkForQuestions } from "../modules/question/question.module";
import { checkForBadge } from "../modules/users/user.module";

export const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
          checkNewMessages();
      }
  }
});


export function checkNewMessages() {
  // Get all messages using data-test attribute
  const messages = document.querySelectorAll('[data-test="chatUserMessageText"]') as unknown as HTMLElement[];

  for (const message of messages) {
    const textContent = message.textContent;

    // Check for questions
    checkForQuestions(message, textContent);

    // Check for mentions
    checkForMentions(message, textContent);

    // Check for moderator messages
    checkForModeratorMessages(message);

    if (message.dataset.badgeChecked !== "true") {
        // Check for badges
        checkForBadge(message);
    }

  }

}
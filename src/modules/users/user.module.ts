import type {User} from '../../../types/user';
import { activeUserManager } from '../users/activeUsers.module'

const CACHE_DURATION = 3000;

/**
 * Get cached users or fetch new ones if cache is expired
 * @returns {Promise<Array>} Array of users
 */
export function getCachedUsers(): User[] {
  const sessionCachedUsers = sessionStorage.getItem('cachedUsers');
  const sessionLastCacheTime = sessionStorage.getItem('lastCacheTime');
  const lastCacheTime = sessionLastCacheTime ? Number(sessionLastCacheTime) : 0;
  const now = Date.now();
  if (! sessionCachedUsers || ((now - lastCacheTime) > CACHE_DURATION)) {
      const getAllCachedUsers = getAllUsers();
      sessionStorage.setItem('cachedUsers', JSON.stringify(getAllCachedUsers));
      sessionStorage.setItem('lastCacheTime', String(now));
  }
  const getAllCachedUsers = JSON.parse(sessionStorage.getItem('cachedUsers') || '[]');

  return getAllCachedUsers;
}

/**
 * Get all users from the user list and chat messages
 * @returns {User[]} Array of user objects with name, initials, and background color
 */
export function getAllUsers(): User[] {
  const usersFromList = getUsersFromUserListItem();
  const usersFromDataMessageID = getUserFromDataMessageID();

  const allUsers = [...usersFromList, ...usersFromDataMessageID];
  const uniqueUsers = Array.from(new Set(allUsers.map(user => user.name)))
    .map(name => allUsers.find(user => user.name === name));

  return uniqueUsers as User[];
}

  // Get users from the user list
export function getUsersFromUserListItem() {
    const users = [];
    // Get users from the user list
    const userListItemElem = document.querySelectorAll('[data-test="userListItem"]') as unknown as HTMLElement[];
    for (const item of userListItemElem) {
        const userNameElement = item.querySelector('[aria-label*="Statut"]');
        if (userNameElement?.textContent) {
            const rawName = userNameElement.textContent.trim();
            const name = cleanUsername(rawName);
            const initials = generateInitials(name);
            const bgColor = generateUserColor(name);
  
            users.push({
              name,
              initials,
              bgColor
          });
        }
    }
    return users;
}

export function getUserFromDataMessageID(): User[]{
    const users: User[] = [];
    const dataMessageID = document.querySelectorAll('[data-message-id]') as unknown as HTMLElement[];
    // Get users from chat messages
    for (const message of dataMessageID) {
        const userNameElement = message.querySelector('.sc-gFkHhu span');
        if (userNameElement?.textContent) {
            const rawName = userNameElement.textContent.trim();
            const name = cleanUsername(rawName);
            const initials= generateInitials(name);
            const bgColor= generateUserColor(name);

            if (name && name !== 'System Message') {
              users.push({
                name,
                initials,
                bgColor
              })
            }
        }
    }
    return users;
  
}

  /**
 * Generate initials from a user's name
 * @param {string} name The user's full name
 * @returns {string} The user's initials in uppercase
 */
export function generateInitials(name: string): string {
  return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
}

/**
 * Generate a consistent color for a user based on their name
 * @param {string} name The user's name
 * @returns {string} HSL color string
 */
export function generateUserColor(name:string):string {
  return `hsl(${name.length * 137.508 % 360}, 70%, 80%)`;
}

/**
 * Clean a username by removing status indicators and extra spaces
 * @param {string} name The raw username to clean
 * @returns {string} The cleaned username
 */
export function cleanUsername(name:string):string {
  return name
      .replace(/\s+Verrouillé($|\s)/g, '')    // Remove "Verrouillé" status
      .replace(/\s+Webcam($|\s)/g, '')        // Remove "Webcam" status
      .replace(/\s+Mobile($|\s)/g, '')        // Remove "Mobile" status
      .replace(/\s+Présentateur($|\s)/g, '')  // Remove "Présentateur" status
      .replace(/\s+Modérateur($|\s)/g, '')    // Remove "Modérateur" status
      .replace(/\s*\|\s*/g, '')               // Remove separators
      .trim();                                // Remove extra spaces
}

export function getActualUserName() {
  const userElement = document.querySelector('[aria-label*="Vous"]');
  if (!userElement) return;

  const ariaLabel = userElement.getAttribute('aria-label');
  if (!ariaLabel) return;

  // Extrait tout ce qui se trouve avant " Vous"
  const fullNameMatch = ariaLabel.match(/(.+?)\s*Vous/);
  if (!fullNameMatch) {
      return;
  }

  // Retourne le nom complet trouvé
  return cleanUsername(fullNameMatch[1].trim());
}

export function checkForBadge(message: HTMLElement) {
    // Remonter dans le DOM pour trouver le parent contenant le username
    const messageContainer = message.closest('[data-test="msgListItem"]');
    const usernameElement = messageContainer?.querySelector('.sc-gFkHhu.irZbhS span') as HTMLElement;

    if (usernameElement) {
        const username = usernameElement.innerText || 'unknown user';

        // Create badge element
        const badge = document.createElement('img');
        badge.style.height = '12px';
        badge.style.marginLeft = '2px';
        badge.style.paddingTop = '1px';

        const isActiveUser = activeUserManager.getUserStatus(username);
        const isModerator = checkIfModerator(message);

        switch (isActiveUser) {
            case 'contributor':
                if (isModerator) {
                    badge.src = 'https://i.ibb.co/6sTGv5H/wwsnb-moderator-badge.png';
                    badge.title = 'Modérateur et Contributeur WWSNB';
                    break;
                }
                badge.src = 'https://i.ibb.co/ZJcNFK0/wwsnb-contributor-badge.png';
                badge.title = 'Contributeur WWSNB';
                break;
            case 'active':
                if (isModerator) {
                    badge.src = 'https://i.ibb.co/6sTGv5H/wwsnb-moderator-badge.png';
                    badge.title = 'Modérateur et Utilisateur WWSNB';
                    break;
                }
                badge.src = 'https://i.ibb.co/LvCh2Rp/wwsnb-user-badge.png';
                badge.title = 'Utilisateur WWSNB';
                break;
            default:
                break; // Pas de badge pour les autres cas
        }

        message.dataset.badgeChecked = "true";

        // Insert badge after username
        usernameElement.insertAdjacentElement('afterend', badge);
    }
}

export function checkIfModerator(message: HTMLElement): boolean {
    // Get parent with role="listitem"
    const parent = message.closest('[role="listitem"]') as HTMLElement;

    // Look for moderator avatar
    const moderatorAvatar = parent.querySelector('[data-test="moderatorAvatar"]');
    return !!moderatorAvatar;
}
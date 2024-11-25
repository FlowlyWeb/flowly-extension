import type { User } from '../../../types/user';
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
      console.log('Fetching users...');
      const getAllCachedUsers = getAllUsers();
      sessionStorage.setItem('cachedUsers', JSON.stringify(getAllCachedUsers));
      console.log('Users fetched:', getAllCachedUsers);
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
  return fullNameMatch[1].trim();
}

[![Flowly Web Banner](https://flowlyweb.com/banner/FlowlyWeb.png)](https://flowly.theovilain.com)

<div align="center">

![Chrome](https://img.shields.io/badge/Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=firefox&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=black)
![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey?style=for-the-badge)

</div>

# Flowly - Where Every Word Matters

🎯 **Browser extension enhancing BigBlueButton with advanced messaging, reactions, and collaboration features.**

Flowly is a sophisticated, cross-browser extension (Chrome/Firefox) that transforms BigBlueButton video conferencing by adding emoji reactions, mention highlighting, active user tracking, warning alerts, break announcements, GIF support, and more. Designed specifically for educational institutions using BigBlueButton.

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Module Guide](#module-guide)
- [WebSocket Integration](#websocket-integration)
- [Configuration](#configuration)
- [Development](#development)
- [Building & Deployment](#building--deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)

---

## ✨ Features

### 😊 Emoji Reactions
- Add emoji reactions to any chat message
- Customizable emoji palette (default: 👍 ❤️ 😂 😮 😢 😡 🎉 🤔 👀 🔥 ✨ 👎)
- Real-time reaction updates via WebSocket
- Automatic user count per reaction
- Click-to-react and view all reactors

### @️ Mention Highlighting
- Automatically highlight messages mentioning you with `@username`
- Visual styling distinguishes personal mentions
- Never miss an important mention
- Works with partial usernames

### 👥 Active Users Tracking
- Real-time display of active participants
- GitHub contributor identification and integration
- User status indicators (active, contributor, etc.)
- 10-second update frequency
- Normalized name matching (accent-insensitive)

### ⚠️ Warning System
- Report technical issues instantly
- Categories: Audio, Video, Screen sharing, Connection
- Moderator alerts with notification sound
- Cooldown protection (120 seconds per category)
- User count tracking for critical issues
- Visual alert resolution/postpone options

### ⏸️ Pause/Break Management
- Preset durations: 5, 10, 15, 30 minutes, or custom
- Full-screen pause notification to all users
- Real-time countdown display
- Moderator controls: Stop, Extend (+5/10/15 min)
- Optional break reason/notes
- Easter egg: Coffee emoji rain for coffee breaks ☕🎉
- Auto-hide after duration expires

### 🎬 Moderator Badge
- Visual badge on moderator messages
- Easy identification of instructor messages
- Special styling for administrative communications

### ❓ Question Highlighting
- Highlight questions marked with `@question` tag
- Visual distinction from regular messages
- Helps instructors identify student questions

### 🖼️ GIF Support
- Search and insert GIFs directly in chat
- Powered by Tenor API (free tier)
- 5-minute response caching for performance
- Category-based browsing
- Direct message insertion with preview

### 💬 Detachable Chat Window
- Pop-out chat window for flexible layout
- Message virtualization (max 100 displayed)
- Automatic cleanup of off-screen messages
- Message categorization (moderator, question, mention)
- Smooth scrolling experience
- Persistent across session

### ⚙️ Customizable Emojis
- Choose up to 12 custom emoji reactions
- Easy emoji picker interface
- Settings persist across sessions
- Emoji-Mart picker with search

### 🔧 Zero Configuration
- Works out of the box with no setup
- Automatic integration with BigBlueButton
- No account required
- Privacy-first design

---

## 🚀 Quick Start

### Installation from App Stores

**Chrome/Brave/Edge**:
1. Visit [Chrome Web Store](https://chromewebstore.google.com/detail/flowly/onphhlbmjailmffempahbcnocelnlcmn)
2. Click "Add to Chrome"
3. Confirm permissions
4. Done! Extension loads automatically

**Firefox**:
1. Visit [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/flowly/)
2. Click "Add to Firefox"
3. Confirm permissions
4. Done! Extension loads automatically

### Using the Extension

1. **Join a BigBlueButton meeting** on supported platforms:
   - oclock.school
   - lutice.online
   - Custom BigBlueButton instances (if installed)

2. **React to messages**: Hover over a message → Click emoji button → Select emoji

3. **Track active users**: See real-time participant list with GitHub contributors

4. **Report issues**: Use warning button to alert moderators of problems

5. **Configure emojis**: Click extension popup → Settings → Customize emojis

---

## 📥 Installation

### For End Users

#### Option 1: Chrome Web Store (Recommended)
```
https://chromewebstore.google.com/detail/flowly/onphhlbmjailmffempahbcnocelnlcmn
```

#### Option 2: Firefox Add-ons (Recommended)
```
https://addons.mozilla.org/firefox/addon/flowly/
```

#### Option 3: Manual Installation (Development)
See [Development Setup](#development) section below.

### Supported Platforms

**Primary Targets** (Full Integration):
- oclock.school - Educational video conferencing
- lutice.online - Lutice LMS integration

**Compatible With**:
- BigBlueButton 2.4+
- Any BBB instance (with limitations)
- Chrome/Chromium 90+
- Firefox 112+
- Edge 90+ (Chromium-based)
- Brave 1.0+
- Opera 76+

### Permissions Required

The extension requests permissions for:
- **Host Access**: `*.oclock.school`, `*.lutice.online`, `theovilain.com`, `tenor.googleapis.com`
- **Storage Access**: Browser sync storage for emoji preferences
- **Tab Access**: To detect BigBlueButton meetings (content script injection)

No background scripts execute to preserve privacy.

---

## 🛠️ Technology Stack

### Core Technologies
- **TypeScript 5.6.3** - Strict type safety with ES2021 target
- **Webpack 5.96.1** - Module bundler with multi-target output
- **Browser WebExtension API** - Cross-browser compatibility
- **WebSocket** - Real-time communication with Flowly backend
- **DOM APIs** - MutationObserver for dynamic content detection

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `webextension-polyfill` | Browser API abstraction (Chrome/Firefox) |
| `@emoji-mart/react` | Emoji picker component |
| `emoji-picker-element` | Custom emoji picker |
| `adm-zip` | ZIP file handling (release scripts) |

### Build Tools

| Tool | Purpose |
|------|---------|
| `webpack` | Module bundling for Chrome/Firefox separately |
| `ts-loader` | TypeScript compilation during build |
| `terser-webpack-plugin` | Code minification for production |
| `copy-webpack-plugin` | Asset management (manifests, icons, styles) |
| `html-webpack-plugin` | HTML generation for popup/settings pages |
| `web-ext` | Firefox testing and submission automation |
| `eslint` | Code quality and consistency |

### Browser APIs Used

- `chrome.runtime.*` - Extension messaging and lifecycle
- `chrome.storage.*` - Persistent emoji preferences
- `browser.webRequest.*` - Request handling
- `MutationObserver` - DOM monitoring
- `WebSocket` - Real-time communication
- `fetch()` - API requests (Tenor, Flowly servers)

---

## 📁 Project Structure

```
flowly-extension/
├── src/
│   ├── content.ts                   # Main entry point (injected into BBB pages)
│   │
│   ├── modules/                     # Feature modules
│   │   ├── mentions.ts              # @mention detection & highlighting
│   │   ├── reactions.ts             # Emoji reaction system
│   │   ├── mentions/
│   │   │   ├── mention.module.ts    # Mention module class
│   │   │   └── event.handler.ts     # Mention event handling
│   │   ├── moderators/
│   │   │   └── moderator.module.ts  # Moderator badge detection
│   │   ├── question/
│   │   │   └── question.module.ts   # Question highlighting
│   │   ├── users/
│   │   │   ├── activeUsers.module.ts # Active user tracking
│   │   │   └── user.module.ts       # User info management
│   │   ├── warning/
│   │   │   └── warning.module.ts    # Warning alert system
│   │   ├── pause/
│   │   │   └── pause.module.ts      # Break announcement system
│   │   ├── gif/
│   │   │   ├── gif.module.ts        # GIF search and insertion
│   │   │   └── gif-selector.element.ts # GIF picker UI
│   │   ├── detachable/
│   │   │   └── detachable.module.ts # Pop-out chat window
│   │   └── suggestion/
│   │       └── suggestionBox.module.ts # Suggestion system
│   │
│   ├── managers/
│   │   └── websocket.manager.ts     # WebSocket singleton with pub/sub
│   │
│   ├── services/                    # Business logic services
│   │   └── ...                      # Service implementations
│   │
│   ├── pages/                       # Extension UI pages
│   │   ├── popup/
│   │   │   ├── popup.html           # Quick access popup
│   │   │   └── popup.ts             # Popup script (version display)
│   │   └── settings/
│   │       ├── settings.html        # Settings page
│   │       └── settings.ts          # Emoji configuration UI
│   │
│   ├── utils/
│   │   ├── observer.ts              # DOM change observation system
│   │   ├── chat.ts                  # Chat message utilities
│   │   └── ...                      # Helper functions
│   │
│   ├── styles/
│   │   └── styles.css               # All extension styling (1,626 lines)
│   │       - Reaction system styles
│   │       - Modal & notification styles
│   │       - Animation keyframes
│   │       - Emoji picker integration
│   │       - Warning & pause styles
│   │       - Message highlighting
│   │
│   └── assets/
│       ├── flowly-48.png            # 48x48 icon
│       ├── flowly-96.png            # 96x96 icon
│       ├── discord.png              # Discord link
│       └── buy-me-a-coffee.png      # Support link
│
├── types/                           # TypeScript type definitions
│   ├── activeUsers.d.ts            # Active user types
│   ├── detachable.d.ts             # Detachable chat types
│   ├── pause.d.ts                  # Pause/break types
│   ├── popup.d.ts                  # Popup types
│   ├── reactions.d.ts              # Reaction types
│   ├── user.d.ts                   # User types
│   ├── warning.d.ts                # Warning types
│   └── gif.d.ts                    # GIF picker types
│
├── icons/                          # Icons (various sizes)
│   ├── flowly-48.png
│   ├── flowly-96.png
│   └── ...
│
├── manifests/                      # Browser-specific manifests
│   ├── chrome/manifest.json        # Manifest V3 (Chrome)
│   ├── firefox/manifest.json       # Manifest V2 (Firefox)
│   └── manifest.json               # Fallback Manifest V2
│
├── scripts/
│   ├── release.ts                  # Release automation script
│   └── tsconfig.json               # TypeScript config for scripts
│
├── dist/                           # Build output (generated)
│   ├── chrome/                     # Chrome-specific build
│   └── firefox/                    # Firefox-specific build
│
├── webpack.config.js               # Webpack configuration
├── tsconfig.json                   # TypeScript compiler options
├── eslint.config.js                # Code quality rules
├── package.json                    # Dependencies & scripts
├── .env.example                    # Environment variables template
│
├── CONTRIBUTING.md                 # Contribution guidelines
├── CONTRIBUTORS.md                 # List of contributors
├── LICENSE                         # CC BY-NC-SA 4.0 License
└── README.md                       # This file
```

---

## 🧩 Module Guide

### Reactions Module (`modules/reactions.ts`)

**Purpose**: Emoji reaction system on messages

**Key Features**:
```typescript
class ReactionManager extends SingletonModule {
  // Inject reaction buttons on messages
  injectReactionButtons(messageContainer: HTMLElement)

  // Handle emoji selection
  handleReactionClick(messageId: string, emoji: string)

  // Update reactions in real-time
  updateReactions(reactions: MessageReactions)

  // Debounced DOM observation
  observeNewMessages()
}
```

**Configuration**:
```typescript
const config = {
  debounceDelay: 100,              // ms
  maxVisibleReactions: 5,          // Per message
  enableReactionCounts: true,
  defaultEmojis: ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🤔', '👀', '🔥', '✨', '👎']
}
```

**Storage**: WebExtension API `storage.sync` for custom emojis

---

### Active Users Module (`modules/users/activeUsers.module.ts`)

**Purpose**: Track and display active participants with GitHub integration

**API Integration**:
```typescript
// WebSocket messages
const register = { type: 'register', username, sessionId }
const heartbeat = { type: 'heartbeat', username, sessionId }

// Responses
const activeUsers = {
  type: 'activeUsers',
  users: ['john', 'jane'],
  githubContributors: [
    { login: 'thevillain', contributions: 45, avatar: 'url' }
  ]
}
```

**Features**:
- 10-second update interval
- Automatic name normalization (accents, case-insensitive)
- GitHub contributor highlighting
- User status levels: 'active', 'contributor', 'none'

---

### Warning Module (`modules/warning/warning.module.ts`)

**Purpose**: Technical issue reporting with moderator alerts

**Warning Types**:
```typescript
enum ProblemType {
  AUDIO = 'audio',
  VIDEO = 'video',
  SCREENSHARE = 'screenshare',
  CONNECTION = 'connection'
}
```

**Features**:
- Sound alerts (synthesized chords)
- User count per problem type
- 120-second cooldown per type
- Toast notifications
- Moderator-only visibility

**Cooldown System**:
```typescript
if (lastWarning + COOLDOWN_TIME > now) {
  // Skip duplicate warning
  return;
}
```

---

### Pause Module (`modules/pause/pause.module.ts`)

**Purpose**: Break/pause announcements to all users

**Presets**:
```typescript
const PRESETS = {
  SHORT: 5 * 60 * 1000,        // 5 minutes
  MEDIUM: 10 * 60 * 1000,      // 10 minutes
  LONG: 15 * 60 * 1000,        // 15 minutes
  VERY_LONG: 30 * 60 * 1000,   // 30 minutes
  CUSTOM: null                  // User input
}
```

**Features**:
- Real-time countdown display
- Moderator controls (stop, extend)
- Pause reason tracking
- Formatted end time display
- Easter egg: Coffee emoji rain for coffee breaks

---

### WebSocket Manager (`managers/websocket.manager.ts`)

**Singleton Pattern**:
```typescript
class WebSocketManager {
  private static instance: WebSocketManager

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }
}
```

**Pub/Sub System**:
```typescript
// Subscribe to message types
manager.subscribe('activeUsers', (data) => {
  updateUserList(data.users)
})

// Send messages
manager.send({
  type: 'reaction_update',
  data: { messageId, emoji, action }
})
```

**Message Queue**:
- Queues messages during offline
- Resends on reconnection
- Preserves message order

**Heartbeat**:
```typescript
setInterval(() => {
  ws.send({ type: 'heartbeat', username, sessionId })
}, 5000)
```

---

## 🌐 WebSocket Integration

### Connection

**Server**: `wss://ws.flowlyweb.com/` (configurable)

**Connection Flow**:
```
Extension Loads
    ↓
WebSocket Manager: new WebSocket(serverUrl)
    ↓
Await Connection Ready
    ↓
Send register { username, sessionId }
    ↓
Receive activeUsers response
    ↓
Subscribe modules to message types
    ↓
Send periodic heartbeats (5s)
```

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `register` | Client→Server | Register user in session |
| `unregister` | Client→Server | Leave session |
| `heartbeat` | Client→Server | Keep-alive (5s interval) |
| `reaction_update` | Client→Server | Send emoji reaction |
| `warning` | Client→Server | Report technical issue |
| `pause` | Client→Server | Announce break |
| `update_reactions` | Server→Client | Broadcast reaction updates |
| `activeUsers` | Server→Client | Active participant list |

### Error Handling

**Reconnection Strategy**:
```typescript
class ReconnectionStrategy {
  private attempts = 0
  private maxAttempts = 5
  private backoffDelay = 1000

  async reconnect() {
    while (attempts < maxAttempts) {
      await delay(backoffDelay)
      try {
        return await connect()
      } catch (e) {
        backoffDelay *= 2  // Exponential backoff
        attempts++
      }
    }
  }
}
```

**Fallback**: Messages queued if WebSocket unavailable

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file for development:

```env
# WebSocket Server
WS_SERVER=wss://ws.flowlyweb.com/

# APIs
TENOR_API_KEY=your_tenor_key  # Free tier (no key needed)

# Browser Store Credentials
AMO_JWT_ISSUER=firefox@addons.mozilla.org
AMO_JWT_SECRET=your_secret
CHROME_CLIENT_ID=your_client_id
CHROME_CLIENT_SECRET=your_secret
CHROME_REFRESH_TOKEN=your_token
CHROME_EXTENSION_ID=onphhlbmjailmffempahbcnocelnlcmn

# Update Server
UPDATE_SERVER=https://updates.flowlyweb.com
UPLOAD_TOKEN=your_token
```

### Webpack Configuration

**Multi-target Build**:
```javascript
// webpack.config.js
const targets = {
  chrome: { manifest: 'chrome/manifest.json' },
  firefox: { manifest: 'manifest.json' },
  'node-scripts': { entry: 'scripts/release.ts' }
}

export default targets.map(target => ({
  entry: getEntryPoints(target),
  output: { path: `dist/${target}/` },
  plugins: [new CopyPlugin({ patterns: getPatterns(target) })]
}))
```

**Build Environment Variables**:
```bash
--env target=chrome      # Chrome build
--env target=firefox     # Firefox build
--env target=both        # Both browsers (default)
```

---

## 🔧 Development

### Prerequisites

- Node.js 18.0.0+
- npm 8.0.0+
- Git
- Code editor (VSCode recommended)

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/FlowlyWeb/flowly-extension.git
   cd flowly-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build for development**
   ```bash
   npm run build
   # Output: dist/chrome/ and dist/firefox/
   ```

5. **Start watch mode**
   ```bash
   npm run dev
   # Rebuilds automatically on file changes
   ```

### Manual Installation (Dev)

#### Chrome/Edge

1. Build: `npm run build:chrome`
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select `dist/chrome/` directory
6. Extension loads and auto-updates on file changes

#### Firefox

1. Build: `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `dist/firefox/manifest.json`
5. For persistent dev: Use `npm start`

### Code Quality

**Linting**:
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

**Code Standards**:
- TypeScript strict mode
- 4-space indentation
- Single quotes
- Semicolons required
- camelCase identifiers
- Meaningful variable names

### Module Development

**Create New Module**:

1. Create module file: `src/modules/myfeature/myfeature.module.ts`

2. Extend base class:
```typescript
import { SingletonModule } from '../base.module'

export class MyFeatureModule extends SingletonModule {
  async setup(): Promise<void> {
    // Initialize module
    this.subscribe('messageType', this.handleMessage.bind(this))
  }

  private handleMessage(data: any): void {
    // Process message
  }

  async cleanup(isRefresh?: boolean): Promise<void> {
    // Cleanup on unload
  }
}
```

3. Register in `src/content.ts`:
```typescript
import { MyFeatureModule } from './modules/myfeature/myfeature.module'

const myFeatureModule = new MyFeatureModule()
await myFeatureModule.setup()
```

### Testing

**Test in Development**:
1. Build extension
2. Load in browser (Chrome/Firefox)
3. Open test BigBlueButton meeting
4. Test feature functionality
5. Check browser console for errors
6. Monitor WebSocket connections (DevTools)

---

## 🏗️ Building & Deployment

### Development Build

```bash
npm run build
# Creates dist/chrome/ and dist/firefox/ with unminified code
```

### Production Build

```bash
npm run build:prod
# Creates minified, optimized builds
# Output: dist/chrome/ and dist/firefox/
```

### Chrome Web Store Deployment

**Manual Upload**:
1. Build: `npm run build:chrome:prod`
2. Visit [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Upload `dist/chrome/` as ZIP
4. Review and publish

**Automated Release**:
```bash
npm run release:chrome
# Requires: CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, etc.
```

### Firefox Add-ons Deployment

**Manual Submission**:
1. Build: `npm run build:firefox:prod`
2. Visit [Firefox Developer Hub](https://addons.mozilla.org/developers/)
3. Upload `dist/firefox/` as ZIP
4. Complete review process

**Automated Release**:
```bash
npm run release:firefox
# Requires: AMO_JWT_ISSUER, AMO_JWT_SECRET
```

### Version Management

**Semantic Versioning**:
```bash
npm run release:major    # 1.0.0 → 2.0.0
npm run release:minor    # 1.0.0 → 1.1.0
npm run release:patch    # 1.0.0 → 1.0.1
```

**Automated Steps**:
1. Update version in manifests
2. Create Git commit with version tag
3. Build for all browsers
4. Upload to stores

---

## 🤝 Contributing

### Contribution Process

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/flowly-extension.git
   cd flowly-extension
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/awesome-feature
   ```

3. **Make Changes**
   - Follow code standards
   - Write clear comments
   - Test thoroughly
   - Keep commits atomic

4. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add awesome feature"
   git commit -m "fix: resolve issue with reactions"
   git commit -m "docs: update README"
   ```

5. **Push & Create Pull Request**
   ```bash
   git push origin feature/awesome-feature
   # Create PR on GitHub with clear description
   ```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (no logic change)
- `refactor:` - Code restructuring
- `perf:` - Performance improvement
- `test:` - Tests
- `chore:` - Tooling/configuration

### Code Style

- **Language**: English for variables, functions, comments
- **Format**: 4 spaces, LF line endings
- **Quotes**: Single quotes
- **Types**: TypeScript strict mode (no `any`)
- **Comments**: JSDoc for public APIs
- **Naming**: camelCase for variables, PascalCase for classes

### Pull Request Guidelines

- Clear description of changes
- Screenshots for UI changes
- Link to related issues
- Update CONTRIBUTORS.md if applicable
- All tests passing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Showing Features

**Issue**: Features (reactions, warnings, etc.) don't appear in BBB

**Solutions**:
1. Verify BigBlueButton version 2.4+
2. Check extension is enabled:
   - Chrome: `chrome://extensions/` → Enable "Flowly"
   - Firefox: `about:addons` → Enable "Flowly"
3. Reload BBB page: `Ctrl+R` (Cmd+R on Mac)
4. Clear browser cache: `Ctrl+Shift+Delete`
5. Check console for errors: `F12` → Console tab

#### WebSocket Connection Failed

**Issue**: "WebSocket connection failed" or reactions not syncing

**Solutions**:
```javascript
// Check WebSocket status
// Open console (F12) and type:
console.log(window.flowlyDebug?.websocket?.connected)

// Check server connectivity
fetch('https://ws.flowlyweb.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

1. Verify internet connection
2. Check if `wss://ws.flowlyweb.com/` is accessible
3. Disable VPN/proxy temporarily
4. Check firewall settings

#### Emojis Not Saving

**Issue**: Custom emoji selection doesn't persist

**Solutions**:
1. Check storage permissions:
   - Chrome: Settings → Privacy → Site settings → Cookies
   - Firefox: Preferences → Privacy → Cookies and Site Data
2. Clear storage and re-configure:
   - Settings page → Customize emojis
3. Check browser console for errors

#### Performance Issues / Slow Chat

**Issue**: Chat is laggy, reactions slow to appear

**Solutions**:
1. Disable detachable chat (if not needed)
2. Reduce custom emoji count
3. Close other browser tabs
4. Update browser to latest version
5. Disable other extensions

### Debug Mode

Enable detailed logging:

```javascript
// In browser console
localStorage.setItem('flowly:debug', 'true')
// Reload page
// Check console for debug logs
```

### Check Browser Support

```javascript
// Verify extension is loaded
if (window.flowly) {
  console.log('Flowly loaded successfully')
  console.log('Version:', window.flowly.version)
} else {
  console.error('Flowly extension not detected')
}
```

### Report Issues

- **GitHub Issues**: https://github.com/FlowlyWeb/flowly-extension/issues
- **Discord**: Join community for support
- **Email**: Support available for enterprise users

---

## 📝 License

**Flowly Extension** is released under the **CC BY-NC-SA 4.0** (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International) License.

**Key Terms**:
- ✅ **Allowed**: Free educational use, personal projects, modifications
- ✅ **Required**: Attribution to original creators
- ❌ **Not Allowed**: Commercial use without permission
- 📋 **Derivatives**: Must use same license (share-alike)

For commercial use or licensing exceptions, contact: Théo Vilain

---

## 👥 Contributors

**Project Creator**: [Théo Vilain](https://github.com/Teyk0o) (Teyk0o)

**Lead Developer**: Théo Vilain

**Contributors**:
- Matthieu Le Priol (Mimouss56) - Client-side development
- Community members - Bug reports, feature requests, translations

**See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for complete list.**

---

## 💬 Community

- **GitHub Discussions**: https://github.com/FlowlyWeb/flowly-extension/discussions
- **Issue Tracker**: https://github.com/FlowlyWeb/flowly-extension/issues
- **Discord Server**: Join for support and announcements
- **Website**: https://flowly.theovilain.com

---

## 💖 Support

**Love Flowly?** Consider supporting the project:

- ⭐ **Star on GitHub**: https://github.com/FlowlyWeb/flowly-extension
- 🐛 **Report bugs**: GitHub Issues
- 💡 **Suggest features**: GitHub Discussions
- 📢 **Share**: Tell friends and colleagues

---

## 🔒 Privacy & Security

**Data Collection**:
- ✅ **No user data collected** beyond WebSocket session messages
- ✅ **No analytics tracking**
- ✅ **No advertisement**
- ✅ **Open source code** - Audit welcome

**WebSocket Communication**:
- Uses WSS (WebSocket Secure) with TLS encryption
- Session-based only (no persistent server storage)
- Messages expire with session

**Storage**:
- Only emoji preferences stored locally
- Sync across devices with browser account (optional)
- No personal data associated with storage

---

## 📚 Additional Resources

### Documentation
- [Browser Extension Guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## ❓ FAQ

**Q: Does Flowly work with any BigBlueButton server?**
A: Flowly is optimized for oclock.school and lutice.online but works with any BBB instance (some features may vary).

**Q: Is Flowly free?**
A: Yes! Flowly is completely free. Educational use only (CC BY-NC-SA 4.0 license).

**Q: How does Flowly handle privacy?**
A: Flowly collects no user data. Only WebSocket session messages are sent (for reactions, warnings, etc.). No analytics, no tracking.

**Q: Can I contribute?**
A: Absolutely! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Q: How do I report bugs?**
A: GitHub Issues: https://github.com/FlowlyWeb/flowly-extension/issues

**Q: Can I modify Flowly for commercial use?**
A: No, the CC BY-NC-SA 4.0 license prohibits commercial use. Contact creator for licensing.

---

## 🎓 Educational Impact

Flowly has been used in educational institutions including:
- oclock.school (France)
- Lutice Learning Management System (France)

**Teachers report**:
- Improved student engagement in video conferences
- Better issue reporting and classroom management
- Enhanced real-time interaction capabilities

---

_Built with ❤️ to enhance educational video conferencing._

**"Where every word matters" - Flowly Team**

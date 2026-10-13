# Spotify Companion - Chrome Extension (Manifest V3)

A high-performance, dark-themed companion Chrome Extension for the **Spotify Web Player** (`open.spotify.com`). Designed for music lovers and power users, it provides seamless playback controls, global keyboard shortcuts, listening session analytics, and a fully customizable widget dashboard directly from the Chrome toolbar.

---

## 🎵 Features

### 1. Music Companion & Playback Controls
* **Automatic Tab Detection**: Discovers running `open.spotify.com` tabs and prioritizes audible playback tabs.
* **Full Media Controls**: Play/Pause, Next Track, Previous Track, Volume adjustment, Mute toggle, Shuffle, and Repeat.
* **Now Playing Display**: Live track title, artist name, high-res album artwork, and real-time progress bar.
* **Smart Fallbacks**: Graceful status display when Spotify is paused or closed with an instant "Open Spotify Web Player" launcher.

### 2. Global Keyboard Shortcuts (Chrome Commands API)
* **Play / Pause**: `Alt + Shift + P` (Mac: `Command + Shift + P`)
* **Next Track**: `Alt + Shift + N` (Mac: `Command + Shift + N`)
* **Previous Track**: `Alt + Shift + B` (Mac: `Command + Shift + B`)
* **Customizable**: Rebind hotkeys at any time via `chrome://extensions/shortcuts`.

### 3. Customizable Widget Dashboard
* Reorder, enable, or disable 7 independent widgets:
  1. **Now Playing**: Album artwork, track title, artist, elapsed/total time, progress bar.
  2. **Playback Controls**: Large glowing play/pause button, skip forward/backward, shuffle, and repeat.
  3. **Volume & Mute**: Smooth volume range slider and one-click mute toggle.
  4. **Session Tracker**: Live session listening duration counter and tracks played counter.
  5. **Quick Jump**: Instant links to Spotify Search, Liked Songs, Your Library, and New Releases.
  6. **Shortcuts Reference**: Cheat sheet of active keyboard commands.
  7. **Listening Notes / Scratchpad**: Local auto-saving notepad for song lyrics, thoughts, or recommendations.
* Full drag/reorder controls in the Settings page with reset-to-defaults functionality.

### 4. Settings & Storage
* Local persistence powered by `chrome.storage.local`.
* Multiple themes: **Charcoal Dark**, **Deep AMOLED (True Black)**, and **Slate Charcoal**.
* Compact popup mode for dense displays.
* Adjustable status polling frequency (500ms – 10,000ms).
* JSON settings Export & Import with schema validation.
* Factory reset action.

### 5. Strict Security & Clean Architecture
* **Manifest V3** compliant.
* **Zero Remote Code**: No external scripts or CDNs.
* **No `eval()`**: Clean, safe DOM construction.
* **Event-Driven**: The background service worker stays dormant until triggered; no wasteful background battery or CPU drain.
* **No Ad Skipping / Interception**: Complies strictly with Spotify's terms of service and Chrome Web Store policies.

---

## 🛠 Technology Stack

* **Architecture**: Chrome Extension Manifest V3
* **Frontend**: HTML5, Vanilla CSS3 (Custom Dark Theme with Emerald Glow), ES Modules (JavaScript)
* **APIs Used**:
  * `chrome.storage.local` (Settings, widgets, session stats)
  * `chrome.commands` (Global media keyboard hotkeys)
  * `chrome.tabs` (Tab discovery, navigation, message dispatching)
  * `chrome.runtime` (Extension lifecycle, options page routing)
* **Test Suite**: Native Node.js Test Runner with zero external dependencies

---

## 📂 Project Structure

```
SpotifyCompanion/
├── manifest.json              # Extension Manifest V3 configuration
├── popup.html                 # Extension popup interface
├── popup.css                  # Dark-theme styles, animations & responsive layout
├── popup.js                   # Popup orchestrator, live polling & DOM updates
├── background.js              # Event-driven service worker for shortcuts & lifecycle
├── content.js                 # Content script injected into open.spotify.com
├── options.html               # Settings and widget management page
├── options.css                # Settings layout and switch styling
├── options.js                 # Settings controller, import/export & backup
├── package.json               # Module declaration and test scripts
├── modules/
│   ├── validation.js          # Input validation, schema guards & HTML sanitization
│   ├── storage.js             # chrome.storage abstraction & test fallback
│   ├── spotify-controller.js  # Tab discovery & command messaging
│   ├── dashboard.js           # Widget registry & ordering manager
│   └── shortcuts.js           # Shortcuts metadata & Chrome settings opener
├── icons/
│   ├── generate_icons.js      # Pure Node.js PNG icon generator
│   ├── icon16.png             # 16x16 icon
│   ├── icon32.png             # 32x32 icon
│   ├── icon48.png             # 48x48 icon
│   └── icon128.png            # 128x128 icon
├── tests/
│   ├── run-tests.js           # Master test runner
│   ├── manifest.test.js       # Manifest schema & file verification
│   ├── syntax.test.js         # JavaScript syntax verification
│   ├── validation.test.js     # Schema and sanitization unit tests
│   ├── storage.test.js        # Storage persistence and healing tests
│   ├── dashboard.test.js      # Widget manager and time format tests
│   ├── controller.test.js     # Tab discovery and mock messaging tests
│   └── ui-contract.test.js    # DOM ID checks and security constraint tests
└── README.md                  # Complete project documentation
```

---

## 🔐 Required Permissions & Rationale

| Permission | Purpose |
| :--- | :--- |
| `storage` | Stores user widget arrangement, theme preferences, listening notes, and session counts locally. |
| `tabs` | Allows the extension to find open `open.spotify.com` tabs and dispatch media control actions without inspecting other browsing tabs. |
| `*://open.spotify.com/*` *(host permission)* | Required to inject the content script (`content.js`) exclusively into the Spotify Web Player to monitor playback status and execute playback controls. |

*Note: No broad permissions like `<all_urls>` or `webNavigation` are requested.*

---

## 🚀 Installation Instructions (Chrome / Chromium / Edge / Brave)

### Step 1: Open Chrome Extensions
1. In Google Chrome, navigate to `chrome://extensions/` in your address bar.
2. In the top-right corner of the Extensions page, switch the toggle for **Developer mode** to **ON**.

### Step 2: Load the Unpacked Extension
1. Click the **Load unpacked** button in the top-left toolbar.
2. In the folder picker dialog, select the `SpotifyCompanion` directory:
   ```
   c:\Users\Pujesh\OneDrive\Desktop\extension\SpotifyCompanion
   ```
3. Click **Select Folder**.
4. The extension **"Spotify Companion - Music Controller & Dashboard"** will appear in your extension list with version `1.0.0`.

### Step 3: Pin the Extension
1. Click the puzzle-piece icon (Extensions) next to your Chrome address bar.
2. Find **Spotify Companion** and click the **Pin** icon to keep it visible on your browser toolbar for quick one-click access.

---

## 🧪 How to Test Each Feature

### 1. Test Without Spotify Open (Disconnected State)
1. Close any open Spotify Web Player tabs.
2. Click the pinned Spotify Companion icon.
3. Observe the connection badge showing **"Disconnected"** and the banner: *"Spotify Web Player Not Detected"*.
4. Click the **"Open Spotify Web Player"** button inside the banner.
5. Notice that Chrome opens `https://open.spotify.com` in a new tab.

### 2. Test Live Playback Controls
1. Log into Spotify Web Player (`open.spotify.com`) and start playing any song.
2. Click the extension icon.
3. Observe:
   - Connection badge switches to **"Connected"** with a glowing green dot.
   - The track title, artist name, and album artwork populate.
   - The progress bar fills in real time.
   - The center control shows the **Pause** icon.
4. Click the **Pause** button: Spotify Web Player pauses immediately.
5. Click the **Play** button: Spotify resumes playback.
6. Click **Next Track** or **Previous Track**: Spotify skips tracks accordingly.
7. Move the **Volume slider** or click **Mute**: Volume changes smoothly.

### 3. Test Global Keyboard Shortcuts
1. Open any random tab (e.g., `google.com` or `wikipedia.org`).
2. Press `Alt + Shift + P` on your keyboard. Spotify Web Player in the background will toggle play/pause.
3. Press `Alt + Shift + N` to skip to the next track.

### 4. Test Customizing Dashboard Widgets
1. In the popup header, click the **Gear icon** (or right-click extension icon > Options).
2. Under **Dashboard Widgets**:
   - Use the **▲ Up** and **▼ Down** arrows to change widget positions (e.g., move "Session Tracker" to the top).
   - Use the toggles to disable any widget (e.g., hide "Listening Notes").
3. Re-open the popup: notice the widgets now reflect your custom order.
4. Click **Reset Layout** in Settings to instantly restore default ordering.

### 5. Test Notepad / Scratchpad
1. Type a note into the **Listening Notes** widget (e.g., "Add track to Weekend playlist").
2. Notice the badge updates to "Saving..." and then "Saved".
3. Close the popup, reopen it, or restart Chrome: your text remains intact.

### 6. Test Settings Backup & Import
1. In the Settings page, scroll down to **Backup & Reset**.
2. Click **Export JSON**: downloads `spotify_companion_settings.json`.
3. Click **Factory Reset**: restores default settings.
4. Click **Import JSON** and select the exported file: settings are restored.

---

## ⌨️ How to Change Keyboard Shortcuts

1. Open `chrome://extensions/shortcuts` in Google Chrome (or click **"Change in Chrome"** on the extension Settings page).
2. Locate **Spotify Companion**.
3. Click the pencil icon next to **Toggle Play / Pause**, **Skip to Next Track**, or **Skip to Previous Track**.
4. Press your desired shortcut combination.
5. You can also change the scope from **In Chrome** to **Global** if you wish to control Spotify while other desktop applications are focused!

---

## 🔄 How to Reload After Editing Code

If you make any changes to the source code:
1. Navigate to `chrome://extensions/`.
2. Locate **Spotify Companion**.
3. Click the circular **Reload** icon on the extension card.
4. Re-open the popup or refresh the `open.spotify.com` tab to load the new content script.

---

## 🧪 Running Automated Tests

A comprehensive automated test suite verifies all files, MV3 schemas, syntax, validation, storage, dashboard, and controller logic:

```bash
# From workspace root
npm test

# Or directly using Node.js
node SpotifyCompanion/tests/run-tests.js
```

### Test Coverage Summary:
* `manifest.test.js`: Validates JSON schema, MV3 keys, exact permission restrictions, and file existence.
* `syntax.test.js`: Checks every `.js` file with Node's native compiler (`node --check`).
* `validation.test.js`: Tests HTML sanitization, URL protocols, volume limits, corrupted object handling, and message action filters.
* `storage.test.js`: Tests storage writes, updates, session counts, and corrupted data healing.
* `dashboard.test.js`: Tests widget reordering, boundary checks, duplicate prevention, and time formatters.
* `controller.test.js`: Tests tab discovery, audible tab preference, message routing, and disconnection handling.
* `ui-contract.test.js`: Tests DOM element IDs, module imports, and security constraints.

---

## 🔧 Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Spotify Web Player Not Detected"** | No tab is currently open at `open.spotify.com`. | Click "Open Spotify Web Player" in the popup or open `https://open.spotify.com` in Chrome. |
| **Controls not responding** | The Spotify tab was refreshed after the extension was reloaded. | Refresh your Spotify Web Player tab (`F5`) to re-inject the content script. |
| **Keyboard shortcuts not working** | Shortcut collision with another extension or Chrome command. | Visit `chrome://extensions/shortcuts` and reassign the keys. |
| **Track title is blank** | Spotify is idle on a playlist page with nothing currently queued. | Press play on any track inside Spotify to initialize playback state. |
| **Corrupted settings after Chrome crash** | Unexpected data written to storage. | Go to Settings > Backup & Reset > click **Reset All Settings**. |

---

## ⚠️ Known Technical Limitations

1. **Spotify Web Player Required**: The extension communicates with `open.spotify.com` running in Chrome. It cannot control standalone desktop Spotify native client applications unless the Web Player is open.
2. **Tab Sleeping / Discarding**: If Chrome's Memory Saver unloads or discards the Spotify tab while inactive for hours, controls will pause until the tab is clicked or focused.
3. **No Ad Interception**: This extension strictly avoids ad skipping, ad muting, or bypasses. When an advertisement plays on free accounts, standard Spotify Web Player behavior applies.

---

## 🛡 Privacy & Security Policy

* **100% Local**: All settings, notes, and session statistics are stored exclusively in Chrome's local sandboxed storage (`chrome.storage.local`).
* **Zero Telemetry**: No tracking pixels, Google Analytics, or external server calls.
* **No Account Credentials**: The extension never asks for, reads, or stores your Spotify username or password.
* **No Remote Scripts**: All code is bundled locally within the extension directory, adhering to Manifest V3 security requirements.

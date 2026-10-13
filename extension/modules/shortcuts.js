/**
 * Spotify Companion - Shortcuts Module
 * Defines shortcut metadata, queries Chrome Commands API, and provides UI formatting.
 */

export const DEFAULT_SHORTCUTS = [
  {
    name: 'play-pause',
    description: 'Play / Pause playback',
    defaultKey: 'Alt + Shift + P',
    macKey: 'Command + Shift + P'
  },
  {
    name: 'next-track',
    description: 'Skip to next track',
    defaultKey: 'Alt + Shift + N',
    macKey: 'Command + Shift + N'
  },
  {
    name: 'previous-track',
    description: 'Skip to previous track',
    defaultKey: 'Alt + Shift + B',
    macKey: 'Command + Shift + B'
  }
];

/**
 * Fetch all registered shortcuts from Chrome Commands API.
 * Falls back to default definitions if commands API is unavailable.
 * @returns {Promise<Array<{name: string, description: string, shortcut: string}>>}
 */
export async function getActiveShortcuts() {
  if (typeof chrome !== 'undefined' && chrome.commands && typeof chrome.commands.getAll === 'function') {
    return new Promise((resolve) => {
      chrome.commands.getAll((commands) => {
        if (!commands || commands.length === 0) {
          resolve(
            DEFAULT_SHORTCUTS.map((s) => ({
              name: s.name,
              description: s.description,
              shortcut: s.defaultKey
            }))
          );
          return;
        }

        const mapped = commands
          .filter((c) => c.name && c.name !== '_execute_action')
          .map((c) => {
            const fallback = DEFAULT_SHORTCUTS.find((s) => s.name === c.name);
            return {
              name: c.name,
              description: c.description || fallback?.description || c.name,
              shortcut: c.shortcut || fallback?.defaultKey || 'Not assigned'
            };
          });

        resolve(mapped);
      });
    });
  }

  // Fallback
  return DEFAULT_SHORTCUTS.map((s) => ({
    name: s.name,
    description: s.description,
    shortcut: s.defaultKey
  }));
}

/**
 * Open Chrome keyboard shortcuts settings tab (chrome://extensions/shortcuts)
 */
export async function openShortcutsSettings() {
  if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
    try {
      await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      return true;
    } catch (err) {
      console.warn('Could not open shortcuts tab directly:', err);
    }
  }
  return false;
}

// Global scope export
if (typeof globalThis !== 'undefined') {
  globalThis.SpotifyShortcuts = {
    DEFAULT_SHORTCUTS,
    getActiveShortcuts,
    openShortcutsSettings
  };
}

/**
 * Spotify Companion - Background Service Worker
 * Handles lifecycle, global keyboard commands, and extension events in Manifest V3.
 * Event-driven: no background polling or unwanted tab spawning.
 */

import { getSettings, resetSettings } from './modules/storage.js';
import { spotifyController } from './modules/spotify-controller.js';

// Setup default settings on initial install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.info('[Spotify Companion] Extension installed/updated. Reason:', details.reason);
  try {
    const settings = await getSettings();
    if (!settings) {
      await resetSettings();
    }
  } catch (err) {
    console.warn('[Spotify Companion] Error initializing storage on install:', err);
  }
});

// Handle Chrome Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.info('[Spotify Companion] Shortcut command triggered:', command);

  try {
    switch (command) {
      case 'play-pause': {
        const res = await spotifyController.togglePlay();
        if (!res.success) {
          console.info('[Spotify Companion] Play/Pause command:', res.error);
        }
        break;
      }

      case 'next-track': {
        const res = await spotifyController.nextTrack();
        if (!res.success) {
          console.info('[Spotify Companion] Next track command:', res.error);
        }
        break;
      }

      case 'previous-track': {
        const res = await spotifyController.previousTrack();
        if (!res.success) {
          console.info('[Spotify Companion] Previous track command:', res.error);
        }
        break;
      }

      default:
        console.warn('[Spotify Companion] Unhandled keyboard command:', command);
        break;
    }
  } catch (err) {
    console.error('[Spotify Companion] Exception processing keyboard command:', err);
  }
});

// Handle background messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    sendResponse({ error: 'Missing action' });
    return false;
  }

  if (message.action === 'PING') {
    sendResponse({ data: 'PONG' });
    return false;
  }

  if (message.action === 'OPEN_SPOTIFY_TAB') {
    spotifyController
      .openSpotifyTab()
      .then((success) => sendResponse({ success }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  return false;
});

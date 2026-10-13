/**
 * Spotify Companion - Spotify Controller Module
 * Discovers Spotify Web Player tabs, manages communication, and dispatches media commands.
 */

import { validateTrackInfo, validateMessage } from './validation.js';

export const SPOTIFY_URL_PATTERN = '*://open.spotify.com/*';
export const SPOTIFY_WEB_URL = 'https://open.spotify.com';

class SpotifyController {
  constructor() {
    this.cachedTabId = null;
  }

  /**
   * Find an available Spotify Web Player tab.
   * Prioritizes audible tabs, then active tabs, then any matching open.spotify.com tab.
   * @returns {Promise<chrome.tabs.Tab|null>}
   */
  async findSpotifyTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      return null;
    }

    try {
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ url: SPOTIFY_URL_PATTERN }, (result) => {
          if (chrome.runtime.lastError) {
            console.warn('[SpotifyController] Tab query error:', chrome.runtime.lastError.message);
            resolve([]);
          } else {
            resolve(result || []);
          }
        });
      });

      if (!tabs || tabs.length === 0) {
        this.cachedTabId = null;
        return null;
      }

      // Priority 1: Audible tab (playing sound)
      const audibleTab = tabs.find((t) => t.audible);
      if (audibleTab) {
        this.cachedTabId = audibleTab.id;
        return audibleTab;
      }

      // Priority 2: Active tab in any window
      const activeTab = tabs.find((t) => t.active);
      if (activeTab) {
        this.cachedTabId = activeTab.id;
        return activeTab;
      }

      // Priority 3: Previously cached tab if still open
      if (this.cachedTabId) {
        const cached = tabs.find((t) => t.id === this.cachedTabId);
        if (cached) return cached;
      }

      // Priority 4: First tab in list
      this.cachedTabId = tabs[0].id;
      return tabs[0];
    } catch (err) {
      console.warn('[SpotifyController] Exception finding Spotify tab:', err);
      this.cachedTabId = null;
      return null;
    }
  }

  /**
   * Send a validated message to the content script on the Spotify tab.
   * @param {string} action
   * @param {any} [payload]
   * @returns {Promise<{success: boolean, data?: any, error?: string, reason?: string}>}
   */
  async sendToTab(action, payload = null) {
    const validation = validateMessage({ action, payload });
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid action', reason: 'INVALID_ACTION' };
    }

    const tab = await this.findSpotifyTab();
    if (!tab || typeof tab.id !== 'number') {
      return {
        success: false,
        error: 'Spotify Web Player tab is not open.',
        reason: 'TAB_NOT_FOUND'
      };
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action, payload }, (response) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          // Tab might have reloaded or closed
          this.cachedTabId = null;
          resolve({
            success: false,
            error: `Could not communicate with Spotify tab: ${lastErr.message}. Ensure the Spotify tab is loaded.`,
            reason: 'CONNECTION_FAILED'
          });
          return;
        }

        if (response && response.error) {
          resolve({
            success: false,
            error: response.error,
            reason: response.reason || 'COMMAND_FAILED'
          });
          return;
        }

        resolve({
          success: true,
          data: response ? response.data : null
        });
      });
    });
  }

  /**
   * Request current playback state from Spotify tab.
   * @returns {Promise<{isConnected: boolean, playback: object, error?: string}>}
   */
  async getPlaybackStatus() {
    const res = await this.sendToTab('GET_PLAYBACK_STATUS');
    if (!res.success) {
      return {
        isConnected: false,
        playback: validateTrackInfo(null),
        error: res.error,
        reason: res.reason
      };
    }

    return {
      isConnected: true,
      playback: validateTrackInfo(res.data)
    };
  }

  /**
   * Toggle Play / Pause
   */
  async togglePlay() {
    return this.sendToTab('TOGGLE_PLAY');
  }

  /**
   * Skip to Next Track
   */
  async nextTrack() {
    return this.sendToTab('NEXT_TRACK');
  }

  /**
   * Skip to Previous Track
   */
  async previousTrack() {
    return this.sendToTab('PREV_TRACK');
  }

  /**
   * Set Playback Volume (0 - 100)
   * @param {number} volume
   */
  async setVolume(volume) {
    return this.sendToTab('SET_VOLUME', { volume });
  }

  /**
   * Toggle Shuffle mode
   */
  async toggleShuffle() {
    return this.sendToTab('TOGGLE_SHUFFLE');
  }

  /**
   * Toggle Repeat mode
   */
  async toggleRepeat() {
    return this.sendToTab('TOGGLE_REPEAT');
  }

  /**
   * Seek playback to percentage or milliseconds
   * @param {number} positionMs
   */
  async seekTo(positionMs) {
    return this.sendToTab('SEEK_TO', { positionMs });
  }

  /**
   * Activate existing Spotify tab or open a new one.
   * @returns {Promise<boolean>}
   */
  async openSpotifyTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return false;

    try {
      const existing = await this.findSpotifyTab();
      if (existing && typeof existing.id === 'number') {
        if (typeof existing.windowId === 'number' && chrome.windows?.update) {
          await chrome.windows.update(existing.windowId, { focused: true });
        }
        await chrome.tabs.update(existing.id, { active: true });
        return true;
      }

      // Create new tab
      await chrome.tabs.create({ url: SPOTIFY_WEB_URL, active: true });
      return true;
    } catch (err) {
      console.error('[SpotifyController] Failed to open Spotify tab:', err);
      return false;
    }
  }
}

export const spotifyController = new SpotifyController();

// Global export
if (typeof globalThis !== 'undefined') {
  globalThis.SpotifyController = spotifyController;
}

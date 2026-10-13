/**
 * Spotify Companion - Dashboard & Widget Management Module
 * Handles widget registration, ordering, enabling/disabling, and safe DOM rendering.
 */

import { KNOWN_WIDGET_IDS, validateWidgetsList, getDefaultWidgets, sanitizeString } from './validation.js';

export const WIDGET_DEFINITIONS = {
  nowPlaying: {
    id: 'nowPlaying',
    title: 'Now Playing',
    description: 'Track details, album art, and playback progress',
    category: 'playback'
  },
  quickControls: {
    id: 'quickControls',
    title: 'Playback Controls',
    description: 'Play/Pause, Skip Back/Forward, Shuffle, and Repeat buttons',
    category: 'playback'
  },
  volumeControl: {
    id: 'volumeControl',
    title: 'Volume & Mute',
    description: 'Quick volume slider and one-click mute toggle',
    category: 'audio'
  },
  sessionStats: {
    id: 'sessionStats',
    title: 'Session Tracker',
    description: 'Tracks played counter and active listening time',
    category: 'analytics'
  },
  quickLinks: {
    id: 'quickLinks',
    title: 'Quick Navigation',
    description: 'One-click shortcuts to Search, Liked Songs, and Library',
    category: 'navigation'
  },
  shortcutsHelper: {
    id: 'shortcutsHelper',
    title: 'Keyboard Shortcuts',
    description: 'Cheat sheet of active browser shortcuts',
    category: 'productivity'
  },
  notepad: {
    id: 'notepad',
    title: 'Listening Notes',
    description: 'Quick scratchpad for song thoughts, lyrics, or notes',
    category: 'productivity'
  }
};

/**
 * Format milliseconds to MM:SS string
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  if (!ms || ms < 0 || Number.isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed seconds to HH:MM:SS or MM:SS
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatElapsedSeconds(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${remSec.toString().padStart(2, '0')}s`;
  }
  return `${mins}m ${remSec.toString().padStart(2, '0')}s`;
}

export class DashboardManager {
  /**
   * @param {Array<{id: string, enabled: boolean, order: number}>} widgets
   */
  constructor(widgets = []) {
    this.widgets = validateWidgetsList(widgets);
  }

  getWidgets() {
    return [...this.widgets];
  }

  getEnabledWidgets() {
    return this.widgets.filter((w) => w.enabled);
  }

  /**
   * Move a widget up or down in the ordering.
   * @param {string} widgetId
   * @param {'up'|'down'} direction
   * @returns {boolean} Whether move succeeded
   */
  moveWidget(widgetId, direction) {
    const index = this.widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return false;

    if (direction === 'up' && index > 0) {
      const temp = this.widgets[index];
      this.widgets[index] = this.widgets[index - 1];
      this.widgets[index - 1] = temp;
    } else if (direction === 'down' && index < this.widgets.length - 1) {
      const temp = this.widgets[index];
      this.widgets[index] = this.widgets[index + 1];
      this.widgets[index + 1] = temp;
    } else {
      return false;
    }

    // Re-index
    this.widgets = this.widgets.map((w, idx) => ({ ...w, order: idx }));
    return true;
  }

  /**
   * Toggle widget enabled status.
   * @param {string} widgetId
   * @param {boolean} [forcedState]
   * @returns {boolean} New enabled state
   */
  toggleWidget(widgetId, forcedState) {
    const item = this.widgets.find((w) => w.id === widgetId);
    if (!item) return false;

    item.enabled = typeof forcedState === 'boolean' ? forcedState : !item.enabled;
    return item.enabled;
  }

  /**
   * Add a new widget item if not already present.
   * @param {string} widgetId
   * @returns {boolean}
   */
  addWidget(widgetId) {
    if (this.widgets.some((w) => w.id === widgetId)) {
      return false; // Already present
    }

    this.widgets.push({
      id: widgetId,
      enabled: true,
      order: this.widgets.length
    });
    return true;
  }

  /**
   * Remove a widget item.
   * @param {string} widgetId
   * @returns {boolean}
   */
  removeWidget(widgetId) {
    const initialLen = this.widgets.length;
    this.widgets = this.widgets.filter((w) => w.id !== widgetId);
    if (this.widgets.length !== initialLen) {
      this.widgets = this.widgets.map((w, idx) => ({ ...w, order: idx }));
      return true;
    }
    return false;
  }

  /**
   * Reset widget layout to system defaults.
   */
  resetToDefaults() {
    this.widgets = getDefaultWidgets();
    return this.widgets;
  }

  /**
   * Update entire widget list with validation.
   * @param {Array} newWidgets
   */
  setWidgets(newWidgets) {
    this.widgets = validateWidgetsList(newWidgets);
    return this.widgets;
  }
}

// Global scope export
if (typeof globalThis !== 'undefined') {
  globalThis.SpotifyDashboard = {
    WIDGET_DEFINITIONS,
    formatTime,
    formatElapsedSeconds,
    DashboardManager
  };
}

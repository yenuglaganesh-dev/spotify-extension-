/**
 * Spotify Companion - Validation Module
 * Provides pure validation and sanitization functions for settings, widgets, messages, and track data.
 * Compatible with ES Modules, CommonJS, and browser global scope.
 */

export const KNOWN_WIDGET_IDS = [
  'nowPlaying',
  'quickControls',
  'volumeControl',
  'sessionStats',
  'quickLinks',
  'shortcutsHelper',
  'notepad'
];

export const VALID_THEMES = ['dark', 'amoled', 'charcoal'];

export const VALID_ACTIONS = [
  'GET_PLAYBACK_STATUS',
  'TOGGLE_PLAY',
  'NEXT_TRACK',
  'PREV_TRACK',
  'SET_VOLUME',
  'TOGGLE_SHUFFLE',
  'TOGGLE_REPEAT',
  'SEEK_TO',
  'PING',
  'OPEN_SPOTIFY_TAB'
];

/**
 * Sanitize a string against basic XSS / HTML injection.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeString(value, maxLength = 500) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  const truncated = str.slice(0, maxLength);
  return truncated
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate image URL ensuring safe protocol (https, http, or data:image)
 * @param {unknown} url
 * @returns {string}
 */
export function sanitizeImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:image/')) {
    // Avoid javascript: or data:text/html
    return trimmed;
  }
  return '';
}

/**
 * Validate volume value between 0 and 100
 * @param {unknown} vol
 * @returns {number}
 */
export function validateVolume(vol) {
  const num = Number(vol);
  if (Number.isNaN(num)) return 50;
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Validate and sanitize track metadata received from Spotify DOM.
 * @param {unknown} raw
 * @returns {object}
 */
export function validateTrackInfo(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      title: '',
      artist: '',
      album: '',
      albumArtUrl: '',
      isPlaying: false,
      progressMs: 0,
      durationMs: 0,
      volume: 100,
      isMuted: false,
      shuffle: false,
      repeat: 'off',
      isAvailable: false
    };
  }

  const isPlaying = Boolean(raw.isPlaying);
  const isAvailable = Boolean(raw.isAvailable);
  const title = sanitizeString(raw.title || '', 200);
  const artist = sanitizeString(raw.artist || '', 200);
  const album = sanitizeString(raw.album || '', 200);
  const albumArtUrl = sanitizeImageUrl(raw.albumArtUrl);

  const progressMs = Math.max(0, Number(raw.progressMs) || 0);
  const durationMs = Math.max(0, Number(raw.durationMs) || 0);
  const volume = validateVolume(raw.volume ?? 100);
  const isMuted = Boolean(raw.isMuted);
  const shuffle = Boolean(raw.shuffle);
  const repeat = ['off', 'context', 'track'].includes(raw.repeat) ? raw.repeat : 'off';

  return {
    title,
    artist,
    album,
    albumArtUrl,
    isPlaying,
    progressMs,
    durationMs,
    volume,
    isMuted,
    shuffle,
    repeat,
    isAvailable
  };
}

/**
 * Validate a single widget configuration item.
 * @param {unknown} item
 * @param {number} fallbackOrder
 * @returns {object|null}
 */
export function validateWidgetItem(item, fallbackOrder = 0) {
  if (!item || typeof item !== 'object') return null;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  if (!id || !/^[a-zA-Z0-9_-]{1,50}$/.test(id)) return null;

  const enabled = typeof item.enabled === 'boolean' ? item.enabled : true;
  const order = Number.isInteger(item.order) && item.order >= 0 ? item.order : fallbackOrder;

  return { id, enabled, order };
}

/**
 * Validate and normalize widget list ensuring no duplicates and continuous order.
 * @param {unknown} widgets
 * @returns {Array<{id: string, enabled: boolean, order: number}>}
 */
export function validateWidgetsList(widgets) {
  if (!Array.isArray(widgets)) {
    return getDefaultWidgets();
  }

  const seenIds = new Set();
  const validList = [];

  for (let i = 0; i < widgets.length; i++) {
    const validated = validateWidgetItem(widgets[i], i);
    if (validated && !seenIds.has(validated.id)) {
      seenIds.add(validated.id);
      validList.push(validated);
    }
  }

  if (validList.length === 0) {
    return getDefaultWidgets();
  }

  // Sort by order and re-index
  validList.sort((a, b) => a.order - b.order);
  return validList.map((w, index) => ({
    id: w.id,
    enabled: w.enabled,
    order: index
  }));
}

/**
 * Returns default widget layout.
 */
export function getDefaultWidgets() {
  return KNOWN_WIDGET_IDS.map((id, index) => ({
    id,
    enabled: true,
    order: index
  }));
}

/**
 * Validate full settings payload.
 * Recovers safe defaults for any invalid or missing fields.
 * @param {unknown} raw
 * @returns {object}
 */
export function validateSettings(raw) {
  const defaults = getDefaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;

  const theme = VALID_THEMES.includes(raw.theme) ? raw.theme : defaults.theme;
  const pollInterval = (Number.isInteger(raw.pollInterval) && raw.pollInterval >= 500 && raw.pollInterval <= 10000)
    ? raw.pollInterval
    : defaults.pollInterval;
  const autoConnect = typeof raw.autoConnect === 'boolean' ? raw.autoConnect : defaults.autoConnect;
  const trackSessionStats = typeof raw.trackSessionStats === 'boolean' ? raw.trackSessionStats : defaults.trackSessionStats;
  const compactMode = typeof raw.compactMode === 'boolean' ? raw.compactMode : defaults.compactMode;
  const notificationsEnabled = typeof raw.notificationsEnabled === 'boolean' ? raw.notificationsEnabled : defaults.notificationsEnabled;
  const accentGlow = typeof raw.accentGlow === 'boolean' ? raw.accentGlow : defaults.accentGlow;
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 5000) : defaults.notes;
  const widgets = validateWidgetsList(raw.widgets);

  return {
    theme,
    pollInterval,
    autoConnect,
    trackSessionStats,
    compactMode,
    notificationsEnabled,
    accentGlow,
    notes,
    widgets
  };
}

/**
 * Returns the default settings configuration.
 */
export function getDefaultSettings() {
  return {
    theme: 'dark',
    pollInterval: 1500,
    autoConnect: true,
    trackSessionStats: true,
    compactMode: false,
    notificationsEnabled: false,
    accentGlow: true,
    notes: '',
    widgets: getDefaultWidgets()
  };
}

/**
 * Validate incoming runtime messages.
 * @param {unknown} message
 * @returns {{isValid: boolean, error?: string, action?: string, payload?: any}}
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return { isValid: false, error: 'Message must be an object' };
  }

  const action = message.action;
  if (typeof action !== 'string' || !VALID_ACTIONS.includes(action)) {
    return { isValid: false, error: `Invalid or unsupported action: ${action}` };
  }

  return { isValid: true, action, payload: message.payload };
}

// Global scope export for non-module environments if any
if (typeof globalThis !== 'undefined') {
  globalThis.SpotifyValidation = {
    KNOWN_WIDGET_IDS,
    VALID_THEMES,
    VALID_ACTIONS,
    sanitizeString,
    sanitizeImageUrl,
    validateVolume,
    validateTrackInfo,
    validateWidgetItem,
    validateWidgetsList,
    getDefaultWidgets,
    validateSettings,
    getDefaultSettings,
    validateMessage
  };
}

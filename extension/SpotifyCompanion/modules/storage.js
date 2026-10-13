/**
 * Spotify Companion - Storage Module
 * Manages persistent state with chrome.storage.local.
 * Includes schema validation, default fallbacks, corruption healing, and memory fallback for tests.
 */

import { validateSettings, getDefaultSettings } from './validation.js';

export const STORAGE_KEYS = {
  SETTINGS: 'spotify_companion_settings',
  SESSION: 'spotify_companion_session'
};

/**
 * Fallback in-memory storage for non-browser or test environments.
 */
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  get(keys, callback) {
    const result = {};
    const keyList = Array.isArray(keys)
      ? keys
      : typeof keys === 'string'
      ? [keys]
      : keys === null || keys === undefined
      ? Array.from(this.store.keys())
      : Object.keys(keys);

    for (const k of keyList) {
      if (this.store.has(k)) {
        result[k] = JSON.parse(JSON.stringify(this.store.get(k)));
      } else if (typeof keys === 'object' && !Array.isArray(keys) && keys !== null && k in keys) {
        result[k] = keys[k];
      }
    }
    if (typeof callback === 'function') {
      callback(result);
    }
    return Promise.resolve(result);
  }

  set(items, callback) {
    for (const [k, v] of Object.entries(items)) {
      this.store.set(k, JSON.parse(JSON.stringify(v)));
    }
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  }

  remove(keys, callback) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      this.store.delete(k);
    }
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  }

  clear(callback) {
    this.store.clear();
    if (typeof callback === 'function') {
      callback();
    }
    return Promise.resolve();
  }
}

const memoryFallback = new MemoryStorage();

/**
 * Detect available storage driver (chrome.storage.local or memory fallback).
 */
function getStorageBackend() {
  if (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === 'function'
  ) {
    return chrome.storage.local;
  }
  return memoryFallback;
}

/**
 * Low-level safe get wrapper.
 */
export async function getRaw(key) {
  try {
    const backend = getStorageBackend();
    return new Promise((resolve, reject) => {
      backend.get([key], (result) => {
        if (typeof chrome !== 'undefined' && chrome?.runtime?.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(result ? result[key] : undefined);
      });
    });
  } catch (err) {
    console.warn(`[Storage] Failed to read key "${key}":`, err);
    return undefined;
  }
}

/**
 * Low-level safe set wrapper.
 */
export async function setRaw(key, value) {
  try {
    const backend = getStorageBackend();
    return new Promise((resolve, reject) => {
      backend.set({ [key]: value }, () => {
        if (typeof chrome !== 'undefined' && chrome?.runtime?.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(true);
      });
    });
  } catch (err) {
    console.error(`[Storage] Failed to write key "${key}":`, err);
    throw err;
  }
}

/**
 * Retrieve user settings.
 * If missing, corrupted, or invalid, repairs and saves default settings safely.
 * @returns {Promise<object>}
 */
export async function getSettings() {
  try {
    const raw = await getRaw(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      const defaults = getDefaultSettings();
      await setRaw(STORAGE_KEYS.SETTINGS, defaults);
      return defaults;
    }

    const validated = validateSettings(raw);
    return validated;
  } catch (err) {
    console.warn('[Storage] Settings corrupt or unavailable, returning defaults:', err);
    return getDefaultSettings();
  }
}

/**
 * Update user settings with validation and persistence.
 * @param {object} updates Partial or full settings object.
 * @returns {Promise<object>} The new validated settings object.
 */
export async function updateSettings(updates) {
  const current = await getSettings();
  const merged = { ...current, ...updates };

  // If widgets list provided, preserve valid structure
  if (updates.widgets) {
    merged.widgets = updates.widgets;
  }

  const validated = validateSettings(merged);
  await setRaw(STORAGE_KEYS.SETTINGS, validated);
  return validated;
}

/**
 * Restore default settings.
 * @returns {Promise<object>}
 */
export async function resetSettings() {
  const defaults = getDefaultSettings();
  await setRaw(STORAGE_KEYS.SETTINGS, defaults);
  return defaults;
}

/**
 * Retrieve current session stats.
 * @returns {Promise<{tracksPlayed: number, sessionStartTime: number, activeSeconds: number}>}
 */
export async function getSessionStats() {
  const defaults = {
    tracksPlayed: 0,
    sessionStartTime: Date.now(),
    activeSeconds: 0
  };

  try {
    const raw = await getRaw(STORAGE_KEYS.SESSION);
    if (!raw || typeof raw !== 'object') {
      return defaults;
    }
    return {
      tracksPlayed: Math.max(0, Number(raw.tracksPlayed) || 0),
      sessionStartTime: Number(raw.sessionStartTime) || Date.now(),
      activeSeconds: Math.max(0, Number(raw.activeSeconds) || 0)
    };
  } catch {
    return defaults;
  }
}

/**
 * Update session stats.
 * @param {object} partial
 */
export async function updateSessionStats(partial) {
  const current = await getSessionStats();
  const updated = {
    ...current,
    ...partial
  };
  await setRaw(STORAGE_KEYS.SESSION, updated);
  return updated;
}

/**
 * Reset session stats.
 */
export async function resetSessionStats() {
  const fresh = {
    tracksPlayed: 0,
    sessionStartTime: Date.now(),
    activeSeconds: 0
  };
  await setRaw(STORAGE_KEYS.SESSION, fresh);
  return fresh;
}

// Global scope export
if (typeof globalThis !== 'undefined') {
  globalThis.SpotifyStorage = {
    STORAGE_KEYS,
    getRaw,
    setRaw,
    getSettings,
    updateSettings,
    resetSettings,
    getSessionStats,
    updateSessionStats,
    resetSessionStats
  };
}

/**
 * Spotify Companion - Content Script
 * Injected into open.spotify.com to monitor playback state and handle control commands.
 * Strictly adheres to extension safety guidelines: NO ad skipping or circumvention.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__SPOTIFY_COMPANION_INJECTED__) {
    return;
  }
  window.__SPOTIFY_COMPANION_INJECTED__ = true;

  console.info('[Spotify Companion] Content script successfully initialized on Spotify Web Player.');

  /**
   * Safe click dispatcher handling modern web component click events
   */
  function simulateClick(element) {
    if (!element) return false;
    try {
      element.focus?.();
      const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      const pointerUp = new PointerEvent('pointerup', { bubbles: true, cancelable: true });
      const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });

      element.dispatchEvent(pointerDown);
      element.dispatchEvent(mouseDown);
      element.dispatchEvent(pointerUp);
      element.dispatchEvent(mouseUp);
      element.dispatchEvent(click);
      return true;
    } catch {
      try {
        element.click();
        return true;
      } catch (err) {
        console.warn('[Spotify Companion] Error simulating click:', err);
        return false;
      }
    }
  }

  /**
   * Helper to parse time string like "1:42" or "3:10" into milliseconds
   */
  function parseTimeToMs(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) * 1000;
    } else if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    }
    return 0;
  }

  /**
   * Query selectors with multiple fallbacks
   */
  function findElement(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        // ignore invalid selector syntax
      }
    }
    return null;
  }

  /**
   * Extract current playback state from the Spotify DOM and MediaSession
   */
  function extractPlaybackState() {
    try {
      // 1. Play / Pause Button state
      const playPauseBtn = findElement([
        'button[data-testid="control-button-playpause"]',
        'button[data-testid="play-button"]',
        'footer button[aria-label="Play"]',
        'footer button[aria-label="Pause"]',
        '[data-testid="player-controls"] button[aria-label="Play"]',
        '[data-testid="player-controls"] button[aria-label="Pause"]'
      ]);

      let isPlaying = false;
      if (playPauseBtn) {
        const ariaLabel = (playPauseBtn.getAttribute('aria-label') || '').toLowerCase();
        const testId = (playPauseBtn.getAttribute('data-testid') || '').toLowerCase();
        // If the button says "Pause", Spotify is currently playing
        if (ariaLabel.includes('pause') || testId.includes('pause')) {
          isPlaying = true;
        } else if (ariaLabel.includes('play') || testId.includes('play')) {
          isPlaying = false;
        }
      }

      // 2. Track Title
      let title = '';
      const titleEl = findElement([
        '[data-testid="context-item-info-title"]',
        '[data-testid="now-playing-widget"] a[data-testid="context-item-link"]',
        '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"] a',
        'footer [data-testid="context-item-info-title"]'
      ]);
      if (titleEl) {
        title = (titleEl.textContent || '').trim();
      }

      // 3. Artist
      let artist = '';
      const artistEl = findElement([
        '[data-testid="context-item-info-artist"]',
        '[data-testid="context-item-info-subtitles"] a',
        '[data-testid="context-item-info-subtitles"]',
        'footer [data-testid="context-item-info-artist"]'
      ]);
      if (artistEl) {
        artist = (artistEl.textContent || '').trim();
      }

      // 4. Album Artwork
      let albumArtUrl = '';
      const artEl = findElement([
        '[data-testid="cover-art-image"]',
        'img[data-testid="cover-art-image"]',
        '[data-testid="now-playing-widget"] img',
        'footer img'
      ]);
      if (artEl && artEl.src && !artEl.src.startsWith('data:image/svg')) {
        albumArtUrl = artEl.src;
      }

      // MediaSession fallback for rich metadata if DOM title is missing
      if (navigator.mediaSession && navigator.mediaSession.metadata) {
        const meta = navigator.mediaSession.metadata;
        if (!title && meta.title) title = meta.title;
        if (!artist && meta.artist) artist = meta.artist;
        if (!albumArtUrl && meta.artwork && meta.artwork.length > 0) {
          albumArtUrl = meta.artwork[meta.artwork.length - 1].src || '';
        }
      }

      // Document title fallback ("Song Title • Artist | Spotify")
      if (!title && document.title && document.title.includes('•')) {
        const parts = document.title.split('•');
        title = parts[0]?.trim() || '';
        if (!artist && parts[1]) {
          artist = parts[1].replace('| Spotify', '').replace('- Spotify', '').trim();
        }
      }

      // 5. Position and Duration
      const posEl = findElement(['[data-testid="playback-position"]', 'footer [data-testid="playback-position"]']);
      const durEl = findElement(['[data-testid="playback-duration"]', 'footer [data-testid="playback-duration"]']);

      const progressMs = posEl ? parseTimeToMs(posEl.textContent) : 0;
      const durationMs = durEl ? parseTimeToMs(durEl.textContent) : 0;

      // 6. Volume
      let volume = 100;
      let isMuted = false;
      const volSlider = findElement([
        '[data-testid="volume-bar"] [role="slider"]',
        '[data-testid="volume-bar"] input[type="range"]'
      ]);
      if (volSlider) {
        const val = volSlider.getAttribute('aria-valuenow') || volSlider.value;
        if (val !== null && val !== undefined) {
          volume = Math.round(Number(val) <= 1 ? Number(val) * 100 : Number(val));
        }
      }

      const muteBtn = findElement(['button[data-testid="volume-bar-toggle-mute-button"]']);
      if (muteBtn) {
        const muteLabel = (muteBtn.getAttribute('aria-label') || '').toLowerCase();
        isMuted = muteLabel.includes('unmute') || volume === 0;
      }

      // 7. Shuffle
      let shuffle = false;
      const shuffleBtn = findElement(['button[data-testid="control-button-shuffle"]']);
      if (shuffleBtn) {
        shuffle = shuffleBtn.getAttribute('aria-checked') === 'true';
      }

      // 8. Repeat
      let repeat = 'off';
      const repeatBtn = findElement(['button[data-testid="control-button-repeat"]']);
      if (repeatBtn) {
        const repChecked = repeatBtn.getAttribute('aria-checked');
        const repLabel = (repeatBtn.getAttribute('aria-label') || '').toLowerCase();
        if (repChecked === 'mixed' || repLabel.includes('one')) {
          repeat = 'track';
        } else if (repChecked === 'true') {
          repeat = 'context';
        }
      }

      const isAvailable = Boolean(title || playPauseBtn);

      return {
        title,
        artist,
        album: '',
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
    } catch (err) {
      console.warn('[Spotify Companion] Error extracting playback state:', err);
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
  }

  /**
   * Action Handlers
   */
  function handleTogglePlay() {
    const playPauseBtn = findElement([
      'button[data-testid="control-button-playpause"]',
      'button[data-testid="play-button"]',
      'footer button[aria-label="Play"]',
      'footer button[aria-label="Pause"]',
      '[data-testid="player-controls"] button[aria-label="Play"]',
      '[data-testid="player-controls"] button[aria-label="Pause"]'
    ]);

    if (playPauseBtn) {
      simulateClick(playPauseBtn);
      return { success: true };
    }

    // MediaSession fallback action
    return { success: false, error: 'Play/Pause button not found in Spotify DOM.' };
  }

  function handleNextTrack() {
    const nextBtn = findElement([
      'button[data-testid="control-button-skip-forward"]',
      'footer button[aria-label="Next"]',
      'footer button[aria-label="Next track"]',
      '[data-testid="player-controls"] button[aria-label="Next"]'
    ]);

    if (nextBtn) {
      simulateClick(nextBtn);
      return { success: true };
    }
    return { success: false, error: 'Next track button not found.' };
  }

  function handlePrevTrack() {
    const prevBtn = findElement([
      'button[data-testid="control-button-skip-back"]',
      'footer button[aria-label="Previous"]',
      'footer button[aria-label="Previous track"]',
      '[data-testid="player-controls"] button[aria-label="Previous"]'
    ]);

    if (prevBtn) {
      simulateClick(prevBtn);
      return { success: true };
    }
    return { success: false, error: 'Previous track button not found.' };
  }

  function handleToggleShuffle() {
    const shuffleBtn = findElement(['button[data-testid="control-button-shuffle"]']);
    if (shuffleBtn) {
      simulateClick(shuffleBtn);
      return { success: true };
    }
    return { success: false, error: 'Shuffle button not found.' };
  }

  function handleToggleRepeat() {
    const repeatBtn = findElement(['button[data-testid="control-button-repeat"]']);
    if (repeatBtn) {
      simulateClick(repeatBtn);
      return { success: true };
    }
    return { success: false, error: 'Repeat button not found.' };
  }

  function handleSetVolume(payload) {
    const targetVol = payload && typeof payload.volume === 'number' ? Math.max(0, Math.min(100, payload.volume)) : 50;

    // Check mute toggle if 0
    const muteBtn = findElement(['button[data-testid="volume-bar-toggle-mute-button"]']);
    if (targetVol === 0 && muteBtn) {
      simulateClick(muteBtn);
      return { success: true };
    }

    const volSlider = findElement([
      '[data-testid="volume-bar"] [role="slider"]',
      '[data-testid="volume-bar"] input[type="range"]'
    ]);

    if (volSlider) {
      try {
        volSlider.value = (targetVol / 100).toString();
        volSlider.setAttribute('aria-valuenow', (targetVol / 100).toString());
        volSlider.dispatchEvent(new Event('input', { bubbles: true }));
        volSlider.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      } catch (err) {
        return { success: false, error: 'Failed to adjust volume slider.' };
      }
    }

    if (muteBtn) {
      simulateClick(muteBtn);
      return { success: true };
    }

    return { success: false, error: 'Volume controls not found.' };
  }

  /**
   * Listen for messages from popup or background service worker
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) {
      sendResponse({ error: 'Invalid message payload' });
      return false;
    }

    const { action, payload } = message;

    switch (action) {
      case 'PING':
        sendResponse({ data: 'PONG' });
        break;

      case 'GET_PLAYBACK_STATUS': {
        const state = extractPlaybackState();
        sendResponse({ data: state });
        break;
      }

      case 'TOGGLE_PLAY': {
        const res = handleTogglePlay();
        // Give Spotify DOM a tick to update before returning state
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 100);
        return true; // Keep channel open for async response
      }

      case 'NEXT_TRACK': {
        const res = handleNextTrack();
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 150);
        return true;
      }

      case 'PREV_TRACK': {
        const res = handlePrevTrack();
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 150);
        return true;
      }

      case 'TOGGLE_SHUFFLE': {
        const res = handleToggleShuffle();
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 100);
        return true;
      }

      case 'TOGGLE_REPEAT': {
        const res = handleToggleRepeat();
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 100);
        return true;
      }

      case 'SET_VOLUME': {
        const res = handleSetVolume(payload);
        setTimeout(() => {
          sendResponse({ data: extractPlaybackState(), ...res });
        }, 50);
        return true;
      }

      default:
        sendResponse({ error: `Unsupported content script action: ${action}` });
        break;
    }

    return false;
  });
})();

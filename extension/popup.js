/**
 * Spotify Companion - Popup Controller
 * Manages dashboard widgets, live Spotify polling, playback commands, and user interactions.
 */

import { getSettings, updateSettings, getSessionStats, updateSessionStats, resetSessionStats } from './modules/storage.js';
import { spotifyController } from './modules/spotify-controller.js';
import { DashboardManager, formatTime, formatElapsedSeconds, WIDGET_DEFINITIONS } from './modules/dashboard.js';
import { getActiveShortcuts, openShortcutsSettings } from './modules/shortcuts.js';
import { sanitizeString } from './modules/validation.js';

// Application State
let appSettings = null;
let dashboardManager = null;
let pollTimer = null;
let sessionStatsTimer = null;
let lastKnownTrackTitle = '';
let currentPlayback = null;
let isConnected = false;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const disconnectedBanner = document.getElementById('disconnectedBanner');
const widgetsContainer = document.getElementById('widgetsContainer');
const emptyWidgetsState = document.getElementById('emptyWidgetsState');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');
const btnOpenOptions = document.getElementById('btnOpenOptions');
const btnLaunchSpotify = document.getElementById('btnLaunchSpotify');
const btnConfigureWidgets = document.getElementById('btnConfigureWidgets');
const btnRefreshStatus = document.getElementById('btnRefreshStatus');

/**
 * Display toast notification
 */
function showToast(text, isError = false) {
  if (!toastNotification || !toastMessage) return;
  toastMessage.textContent = text;
  toastNotification.style.borderLeftColor = isError ? 'var(--danger-color)' : 'var(--accent-green)';
  toastNotification.classList.remove('hidden');

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toastNotification.classList.add('hidden');
  }, 2600);
}

/**
 * Apply theme and layout classes to body
 */
function applyAppearance(settings) {
  document.body.className = '';
  document.body.classList.add(`theme-${settings.theme || 'dark'}`);
  if (settings.compactMode) {
    document.body.classList.add('compact-mode');
  }
}

/**
 * Update Connection Badge UI
 */
function updateConnectionBadge(connected) {
  isConnected = connected;
  if (!connectionStatus) return;

  const dot = connectionStatus.querySelector('.status-dot');
  const label = connectionStatus.querySelector('.status-label');

  if (connected) {
    connectionStatus.className = 'status-badge connected';
    if (label) label.textContent = 'Connected';
    if (disconnectedBanner) disconnectedBanner.classList.add('hidden');
  } else {
    connectionStatus.className = 'status-badge disconnected';
    if (label) label.textContent = 'Disconnected';
    if (disconnectedBanner) disconnectedBanner.classList.remove('hidden');
  }
}

/**
 * Render Widget: Now Playing
 */
function renderNowPlayingWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
        <span>Now Playing</span>
      </div>
      <span id="npPlaybackStatus" class="status-badge" style="font-size: 9.5px; padding: 2px 6px;">Idle</span>
    </div>
    <div class="now-playing-body">
      <div class="cover-wrapper">
        <img id="npCoverArt" class="cover-art hidden" alt="Album Art" />
        <div id="npCoverPlaceholder" class="cover-placeholder">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
      </div>
      <div class="track-details">
        <div id="npTrackTitle" class="track-title" title="Track Title">No track playing</div>
        <div id="npTrackArtist" class="track-artist" title="Artist">Connect Spotify to listen</div>
        <div class="progress-container">
          <div class="progress-bar-bg">
            <div id="npProgressFill" class="progress-bar-fill"></div>
          </div>
          <div class="progress-timestamps">
            <span id="npTimeCurrent">0:00</span>
            <span id="npTimeDuration">0:00</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Widget: Playback Controls
 */
function renderQuickControlsWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
        <span>Controls</span>
      </div>
    </div>
    <div class="controls-row">
      <button id="ctrlShuffle" class="ctrl-btn" aria-label="Toggle Shuffle" title="Shuffle">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 3 21 3 21 8"></polyline>
          <line x1="4" y1="20" x2="21" y2="3"></line>
          <polyline points="21 16 21 21 16 21"></polyline>
          <line x1="15" y1="15" x2="21" y2="21"></line>
          <line x1="4" y1="4" x2="9" y2="9"></line>
        </svg>
      </button>

      <button id="ctrlPrev" class="ctrl-btn" aria-label="Previous Track" title="Previous Track (Alt+Shift+B)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <polygon points="19 20 9 12 19 4 19 20"></polygon>
          <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        </svg>
      </button>

      <button id="ctrlPlayPause" class="ctrl-btn ctrl-play-pause" aria-label="Play or Pause" title="Play / Pause (Alt+Shift+P)">
        <svg id="iconPlay" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <svg id="iconPause" class="hidden" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      </button>

      <button id="ctrlNext" class="ctrl-btn" aria-label="Next Track" title="Next Track (Alt+Shift+N)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        </svg>
      </button>

      <button id="ctrlRepeat" class="ctrl-btn" aria-label="Toggle Repeat" title="Repeat">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="17 1 21 5 17 9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7 23 3 19 7 15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
      </button>
    </div>
  `;

  // Attach control events
  const ctrlPlayPause = card.querySelector('#ctrlPlayPause');
  const ctrlPrev = card.querySelector('#ctrlPrev');
  const ctrlNext = card.querySelector('#ctrlNext');
  const ctrlShuffle = card.querySelector('#ctrlShuffle');
  const ctrlRepeat = card.querySelector('#ctrlRepeat');

  ctrlPlayPause?.addEventListener('click', async () => {
    ctrlPlayPause.disabled = true;
    const res = await spotifyController.togglePlay();
    ctrlPlayPause.disabled = false;
    if (!res.success) showToast(res.error || 'Failed to toggle playback', true);
    pollPlayback();
  });

  ctrlPrev?.addEventListener('click', async () => {
    ctrlPrev.disabled = true;
    const res = await spotifyController.previousTrack();
    ctrlPrev.disabled = false;
    if (!res.success) showToast(res.error || 'Failed to skip back', true);
    pollPlayback();
  });

  ctrlNext?.addEventListener('click', async () => {
    ctrlNext.disabled = true;
    const res = await spotifyController.nextTrack();
    ctrlNext.disabled = false;
    if (!res.success) showToast(res.error || 'Failed to skip forward', true);
    pollPlayback();
  });

  ctrlShuffle?.addEventListener('click', async () => {
    const res = await spotifyController.toggleShuffle();
    if (!res.success) showToast(res.error || 'Shuffle failed', true);
    pollPlayback();
  });

  ctrlRepeat?.addEventListener('click', async () => {
    const res = await spotifyController.toggleRepeat();
    if (!res.success) showToast(res.error || 'Repeat failed', true);
    pollPlayback();
  });
}

/**
 * Render Widget: Volume & Mute
 */
function renderVolumeWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <span>Volume Control</span>
      </div>
    </div>
    <div class="volume-row">
      <button id="btnToggleMute" class="ctrl-btn" aria-label="Mute / Unmute" title="Mute Toggle">
        <svg id="iconVolHigh" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path>
        </svg>
        <svg id="iconVolMuted" class="hidden" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
          <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
        </svg>
      </button>

      <input id="sliderVolume" type="range" min="0" max="100" value="80" class="volume-slider" aria-label="Volume Slider" />
      <span id="labelVolumePercent" class="volume-value">80%</span>
    </div>
  `;

  const slider = card.querySelector('#sliderVolume');
  const label = card.querySelector('#labelVolumePercent');
  const btnMute = card.querySelector('#btnToggleMute');

  slider?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    if (label) label.textContent = `${val}%`;
  });

  slider?.addEventListener('change', async (e) => {
    const val = Number(e.target.value);
    await spotifyController.setVolume(val);
  });

  btnMute?.addEventListener('click', async () => {
    const currentVol = Number(slider?.value || 50);
    const targetVol = currentVol === 0 ? 50 : 0;
    if (slider) slider.value = targetVol;
    if (label) label.textContent = `${targetVol}%`;
    await spotifyController.setVolume(targetVol);
    pollPlayback();
  });
}

/**
 * Render Widget: Session Tracker
 */
function renderSessionStatsWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>Session Tracker</span>
      </div>
      <button id="btnResetSession" class="link-btn" title="Reset Session Stats">Reset</button>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Listening Time</span>
        <span id="statListeningTime" class="stat-value">0m 00s</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Tracks Played</span>
        <span id="statTracksPlayed" class="stat-value">0</span>
      </div>
    </div>
  `;

  card.querySelector('#btnResetSession')?.addEventListener('click', async () => {
    await resetSessionStats();
    showToast('Session stats reset');
    updateSessionUI();
  });
}

/**
 * Render Widget: Quick Navigation Links
 */
function renderQuickLinksWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>Quick Jump</span>
      </div>
    </div>
    <div class="quicklinks-grid">
      <button class="quicklink-btn" data-url="https://open.spotify.com/search">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Search
      </button>
      <button class="quicklink-btn" data-url="https://open.spotify.com/collection/tracks">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        Liked Songs
      </button>
      <button class="quicklink-btn" data-url="https://open.spotify.com/collection/playlists">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        Your Library
      </button>
      <button class="quicklink-btn" data-url="https://open.spotify.com/genre/new-releases">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 14 14"></polyline>
        </svg>
        New Releases
      </button>
    </div>
  `;

  card.querySelectorAll('.quicklink-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const url = btn.getAttribute('data-url');
      if (url && chrome?.tabs?.create) {
        await chrome.tabs.create({ url, active: true });
      }
    });
  });
}

/**
 * Render Widget: Shortcuts Helper
 */
function renderShortcutsWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"></path>
        </svg>
        <span>Shortcuts</span>
      </div>
      <button id="btnConfigureShortcuts" class="link-btn" title="Open Chrome shortcuts configuration">Configure</button>
    </div>
    <div id="shortcutsListContainer" class="shortcuts-list">
      <div class="shortcut-row">
        <span class="shortcut-name">Play / Pause</span>
        <kbd class="shortcut-kbd">Alt + Shift + P</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">Next Track</span>
        <kbd class="shortcut-kbd">Alt + Shift + N</kbd>
      </div>
      <div class="shortcut-row">
        <span class="shortcut-name">Previous Track</span>
        <kbd class="shortcut-kbd">Alt + Shift + B</kbd>
      </div>
    </div>
  `;

  card.querySelector('#btnConfigureShortcuts')?.addEventListener('click', () => {
    openShortcutsSettings();
  });

  // Populate dynamic keys if available
  getActiveShortcuts().then((shortcuts) => {
    const list = card.querySelector('#shortcutsListContainer');
    if (list && shortcuts && shortcuts.length > 0) {
      list.innerHTML = '';
      shortcuts.forEach((sc) => {
        const row = document.createElement('div');
        row.className = 'shortcut-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'shortcut-name';
        nameSpan.textContent = sc.description;

        const kbd = document.createElement('kbd');
        kbd.className = 'shortcut-kbd';
        kbd.textContent = sc.shortcut || 'Not Set';

        row.appendChild(nameSpan);
        row.appendChild(kbd);
        list.appendChild(row);
      });
    }
  });
}

/**
 * Render Widget: Notepad
 */
function renderNotepadWidget(card) {
  card.innerHTML = `
    <div class="widget-header">
      <div class="widget-title-area">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>Listening Notes</span>
      </div>
      <span id="notesStatus" class="notepad-status">Saved</span>
    </div>
    <textarea id="notepadInput" class="notepad-textarea" placeholder="Jot down track thoughts, lyrics, or song recommendations..." maxlength="5000"></textarea>
    <div class="notepad-footer">
      <span id="notepadCharCount">0 / 5000</span>
      <span>Auto-saved locally</span>
    </div>
  `;

  const textarea = card.querySelector('#notepadInput');
  const charCount = card.querySelector('#notepadCharCount');
  const status = card.querySelector('#notesStatus');

  if (textarea && appSettings?.notes) {
    textarea.value = appSettings.notes;
    if (charCount) charCount.textContent = `${textarea.value.length} / 5000`;
  }

  let saveTimer = null;
  textarea?.addEventListener('input', () => {
    if (charCount) charCount.textContent = `${textarea.value.length} / 5000`;
    if (status) status.textContent = 'Saving...';

    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await updateSettings({ notes: textarea.value });
      if (status) status.textContent = 'Saved';
    }, 400);
  });
}

/**
 * Render all enabled widgets into container
 */
function renderDashboard() {
  if (!widgetsContainer || !dashboardManager) return;
  widgetsContainer.innerHTML = '';

  const enabledWidgets = dashboardManager.getEnabledWidgets();

  if (enabledWidgets.length === 0) {
    if (emptyWidgetsState) emptyWidgetsState.classList.remove('hidden');
    return;
  }

  if (emptyWidgetsState) emptyWidgetsState.classList.add('hidden');

  enabledWidgets.forEach((widget) => {
    const card = document.createElement('section');
    card.className = 'widget-card';
    card.setAttribute('data-widget-id', widget.id);

    switch (widget.id) {
      case 'nowPlaying':
        renderNowPlayingWidget(card);
        break;
      case 'quickControls':
        renderQuickControlsWidget(card);
        break;
      case 'volumeControl':
        renderVolumeWidget(card);
        break;
      case 'sessionStats':
        renderSessionStatsWidget(card);
        break;
      case 'quickLinks':
        renderQuickLinksWidget(card);
        break;
      case 'shortcutsHelper':
        renderShortcutsWidget(card);
        break;
      case 'notepad':
        renderNotepadWidget(card);
        break;
      default:
        console.warn('Unknown widget:', widget.id);
        break;
    }

    widgetsContainer.appendChild(card);
  });

  // Re-apply current playback status to new DOM
  if (currentPlayback) {
    updatePlaybackUI(currentPlayback);
  }
}

/**
 * Update UI with latest playback information
 */
function updatePlaybackUI(data) {
  currentPlayback = data;

  // 1. Now Playing Elements
  const npTrackTitle = document.getElementById('npTrackTitle');
  const npTrackArtist = document.getElementById('npTrackArtist');
  const npCoverArt = document.getElementById('npCoverArt');
  const npCoverPlaceholder = document.getElementById('npCoverPlaceholder');
  const npProgressFill = document.getElementById('npProgressFill');
  const npTimeCurrent = document.getElementById('npTimeCurrent');
  const npTimeDuration = document.getElementById('npTimeDuration');
  const npPlaybackStatus = document.getElementById('npPlaybackStatus');

  if (npTrackTitle) {
    npTrackTitle.textContent = data.title || (data.isPlaying ? 'Playing track' : 'No track active');
    npTrackTitle.title = data.title || '';
  }

  if (npTrackArtist) {
    npTrackArtist.textContent = data.artist || (isConnected ? 'Spotify Web Player Ready' : 'Spotify is closed');
    npTrackArtist.title = data.artist || '';
  }

  if (npPlaybackStatus) {
    npPlaybackStatus.textContent = data.isPlaying ? 'Playing' : (isConnected ? 'Paused' : 'Offline');
    npPlaybackStatus.className = `status-badge ${data.isPlaying ? 'connected' : 'disconnected'}`;
  }

  if (npCoverArt && npCoverPlaceholder) {
    if (data.albumArtUrl) {
      npCoverArt.src = data.albumArtUrl;
      npCoverArt.classList.remove('hidden');
      npCoverPlaceholder.classList.add('hidden');
    } else {
      npCoverArt.classList.add('hidden');
      npCoverPlaceholder.classList.remove('hidden');
    }
  }

  if (npProgressFill) {
    const percent = data.durationMs > 0 ? Math.min(100, (data.progressMs / data.durationMs) * 100) : 0;
    npProgressFill.style.width = `${percent}%`;
  }

  if (npTimeCurrent) npTimeCurrent.textContent = formatTime(data.progressMs);
  if (npTimeDuration) npTimeDuration.textContent = formatTime(data.durationMs);

  // 2. Play / Pause Control Button
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const ctrlPlayPause = document.getElementById('ctrlPlayPause');

  if (iconPlay && iconPause) {
    if (data.isPlaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      if (ctrlPlayPause) ctrlPlayPause.setAttribute('aria-label', 'Pause');
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      if (ctrlPlayPause) ctrlPlayPause.setAttribute('aria-label', 'Play');
    }
  }

  // 3. Shuffle & Repeat Buttons
  const ctrlShuffle = document.getElementById('ctrlShuffle');
  const ctrlRepeat = document.getElementById('ctrlRepeat');

  if (ctrlShuffle) {
    if (data.shuffle) ctrlShuffle.classList.add('active');
    else ctrlShuffle.classList.remove('active');
  }

  if (ctrlRepeat) {
    if (data.repeat !== 'off') ctrlRepeat.classList.add('active');
    else ctrlRepeat.classList.remove('active');
  }

  // 4. Volume UI
  const sliderVolume = document.getElementById('sliderVolume');
  const labelVolumePercent = document.getElementById('labelVolumePercent');
  const iconVolHigh = document.getElementById('iconVolHigh');
  const iconVolMuted = document.getElementById('iconVolMuted');

  if (sliderVolume && typeof data.volume === 'number' && document.activeElement !== sliderVolume) {
    sliderVolume.value = data.volume;
  }
  if (labelVolumePercent && typeof data.volume === 'number') {
    labelVolumePercent.textContent = `${data.volume}%`;
  }
  if (iconVolHigh && iconVolMuted) {
    if (data.isMuted || data.volume === 0) {
      iconVolHigh.classList.add('hidden');
      iconVolMuted.classList.remove('hidden');
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolMuted.classList.add('hidden');
    }
  }

  // 5. Session tracker track count increment
  if (appSettings?.trackSessionStats && data.isPlaying && data.title && data.title !== lastKnownTrackTitle) {
    lastKnownTrackTitle = data.title;
    getSessionStats().then((stats) => {
      updateSessionStats({ tracksPlayed: stats.tracksPlayed + 1 }).then(updateSessionUI);
    });
  }
}

/**
 * Update Session Tracker UI elements
 */
async function updateSessionUI() {
  const stats = await getSessionStats();
  const statListeningTime = document.getElementById('statListeningTime');
  const statTracksPlayed = document.getElementById('statTracksPlayed');

  if (statTracksPlayed) {
    statTracksPlayed.textContent = stats.tracksPlayed.toString();
  }
  if (statListeningTime) {
    const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000);
    statListeningTime.textContent = formatElapsedSeconds(elapsed);
  }
}

/**
 * Poll playback status from Spotify Web Player
 */
async function pollPlayback() {
  try {
    const res = await spotifyController.getPlaybackStatus();
    updateConnectionBadge(res.isConnected);

    if (res.isConnected && res.playback) {
      updatePlaybackUI(res.playback);
    } else {
      updatePlaybackUI({
        title: '',
        artist: '',
        album: '',
        albumArtUrl: '',
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
        volume: 80,
        isMuted: false,
        shuffle: false,
        repeat: 'off',
        isAvailable: false
      });
    }
  } catch (err) {
    console.warn('[Popup] Polling error:', err);
    updateConnectionBadge(false);
  }
}

/**
 * Initialize Popup
 */
async function init() {
  try {
    // 1. Load settings
    appSettings = await getSettings();
    applyAppearance(appSettings);

    // 2. Setup dashboard
    dashboardManager = new DashboardManager(appSettings.widgets);
    renderDashboard();

    // 3. Setup event listeners
    btnOpenOptions?.addEventListener('click', () => {
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('options.html');
      }
    });

    btnConfigureWidgets?.addEventListener('click', () => {
      if (chrome?.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('options.html');
      }
    });

    btnLaunchSpotify?.addEventListener('click', async () => {
      btnLaunchSpotify.disabled = true;
      showToast('Opening Spotify Web Player...');
      await spotifyController.openSpotifyTab();
      setTimeout(pollPlayback, 800);
      btnLaunchSpotify.disabled = false;
    });

    btnRefreshStatus?.addEventListener('click', async () => {
      showToast('Syncing with Spotify...');
      await pollPlayback();
    });

    // 4. Initial status sync
    await pollPlayback();

    // 5. Start Polling timer (runs only while popup is open)
    const interval = Math.max(1000, Number(appSettings.pollInterval) || 1500);
    pollTimer = setInterval(pollPlayback, interval);

    // 6. Session tracking timer
    if (appSettings.trackSessionStats) {
      updateSessionUI();
      sessionStatsTimer = setInterval(updateSessionUI, 2000);
    }
  } catch (err) {
    console.error('[Popup] Initialization failure:', err);
    showToast('Failed to initialize companion: ' + err.message, true);
  }
}

// Cleanup on popup close
window.addEventListener('unload', () => {
  if (pollTimer) clearInterval(pollTimer);
  if (sessionStatsTimer) clearInterval(sessionStatsTimer);
});

// Run
document.addEventListener('DOMContentLoaded', init);

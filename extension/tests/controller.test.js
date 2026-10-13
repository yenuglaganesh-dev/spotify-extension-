import assert from 'assert';
import { spotifyController } from '../modules/spotify-controller.js';

export async function runControllerTests() {
  console.log('\n--- Running Spotify Controller & Message Passing Tests ---');

  // Test 1: Tab not open scenario (chrome is undefined or tabs.query returns [])
  // Setup global mock for chrome API
  const originalChrome = globalThis.chrome;

  // Scenario A: chrome.tabs.query returns empty list
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      query: (filter, callback) => callback([]),
      sendMessage: (tabId, msg, callback) => callback(null),
      create: async () => ({ id: 999 })
    }
  };

  const missingTabRes = await spotifyController.getPlaybackStatus();
  assert.strictEqual(missingTabRes.isConnected, false);
  assert.strictEqual(missingTabRes.reason, 'TAB_NOT_FOUND');
  assert.strictEqual(missingTabRes.playback.isPlaying, false);

  const commandWithoutTab = await spotifyController.togglePlay();
  assert.strictEqual(commandWithoutTab.success, false);
  assert.strictEqual(commandWithoutTab.reason, 'TAB_NOT_FOUND');

  // Scenario B: Tab exists, audible prioritization
  const mockTabs = [
    { id: 101, url: 'https://open.spotify.com/collection/tracks', audible: false, active: false },
    { id: 102, url: 'https://open.spotify.com/', audible: true, active: false }, // Audible playing music
    { id: 103, url: 'https://open.spotify.com/search', audible: false, active: true }
  ];

  globalThis.chrome.tabs.query = (filter, callback) => callback(mockTabs);

  const foundTab = await spotifyController.findSpotifyTab();
  assert.strictEqual(foundTab.id, 102, 'Should prioritize audible Spotify tab');

  // Scenario C: Message dispatching to content script
  let dispatchedTabId = null;
  let dispatchedMessage = null;

  globalThis.chrome.tabs.sendMessage = (tabId, msg, callback) => {
    dispatchedTabId = tabId;
    dispatchedMessage = msg;
    // Simulate content script response
    if (msg.action === 'GET_PLAYBACK_STATUS') {
      callback({
        data: {
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          isPlaying: true,
          progressMs: 30000,
          durationMs: 200000,
          volume: 80,
          isAvailable: true
        }
      });
    } else if (msg.action === 'TOGGLE_PLAY') {
      callback({ success: true, data: { isPlaying: false } });
    } else if (msg.action === 'NEXT_TRACK') {
      callback({ success: true, data: { title: 'Save Your Tears' } });
    } else {
      callback({ success: true });
    }
  };

  const statusRes = await spotifyController.getPlaybackStatus();
  assert.strictEqual(statusRes.isConnected, true);
  assert.strictEqual(dispatchedTabId, 102);
  assert.strictEqual(statusRes.playback.title, 'Blinding Lights');
  assert.strictEqual(statusRes.playback.isPlaying, true);

  const playRes = await spotifyController.togglePlay();
  assert.strictEqual(playRes.success, true);
  assert.strictEqual(dispatchedMessage.action, 'TOGGLE_PLAY');

  const nextRes = await spotifyController.nextTrack();
  assert.strictEqual(nextRes.success, true);
  assert.strictEqual(dispatchedMessage.action, 'NEXT_TRACK');

  // Scenario D: Tab exists, but sendMessage fails
  globalThis.chrome.runtime.lastError = null;
  globalThis.chrome.tabs.sendMessage = (tabId, msg, callback) => {
    globalThis.chrome.runtime.lastError = { message: 'The message port closed before a response was received.' };
    callback(null);
  };

  const failedRes = await spotifyController.previousTrack();
  assert.strictEqual(failedRes.success, false);
  assert.strictEqual(failedRes.reason, 'CONNECTION_FAILED');

  // Restore global
  globalThis.chrome = originalChrome;

  console.log('✓ Tab discovery, messaging routing, and error resilience verified');
}

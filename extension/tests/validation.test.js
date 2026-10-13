import assert from 'assert';
import {
  sanitizeString,
  sanitizeImageUrl,
  validateVolume,
  validateTrackInfo,
  validateWidgetItem,
  validateWidgetsList,
  getDefaultWidgets,
  validateSettings,
  getDefaultSettings,
  validateMessage,
  KNOWN_WIDGET_IDS
} from '../modules/validation.js';

export async function runValidationTests() {
  console.log('\n--- Running Validation & Sanitization Tests ---');

  // 1. sanitizeString
  assert.strictEqual(sanitizeString('Hello World'), 'Hello World');
  assert.strictEqual(sanitizeString('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.strictEqual(sanitizeString('"quoted" & \'apostrophe\''), '&quot;quoted&quot; &amp; &#039;apostrophe&#039;');
  assert.strictEqual(sanitizeString(null), '');
  assert.strictEqual(sanitizeString(undefined), '');
  assert.strictEqual(sanitizeString('a'.repeat(600), 10), 'a'.repeat(10));

  // 2. sanitizeImageUrl
  assert.strictEqual(sanitizeImageUrl('https://i.scdn.co/image/ab67616d0000b273'), 'https://i.scdn.co/image/ab67616d0000b273');
  assert.strictEqual(sanitizeImageUrl('http://example.com/art.png'), 'http://example.com/art.png');
  assert.strictEqual(sanitizeImageUrl('data:image/png;base64,xxxx'), 'data:image/png;base64,xxxx');
  assert.strictEqual(sanitizeImageUrl('javascript:alert(1)'), '');
  assert.strictEqual(sanitizeImageUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.strictEqual(sanitizeImageUrl(null), '');
  assert.strictEqual(sanitizeImageUrl(12345), '');

  // 3. validateVolume
  assert.strictEqual(validateVolume(50), 50);
  assert.strictEqual(validateVolume(0), 0);
  assert.strictEqual(validateVolume(100), 100);
  assert.strictEqual(validateVolume(-20), 0);
  assert.strictEqual(validateVolume(150), 100);
  assert.strictEqual(validateVolume('75'), 75);
  assert.strictEqual(validateVolume('invalid'), 50);

  // 4. validateTrackInfo
  const emptyTrack = validateTrackInfo(null);
  assert.strictEqual(emptyTrack.title, '');
  assert.strictEqual(emptyTrack.artist, '');
  assert.strictEqual(emptyTrack.isPlaying, false);
  assert.strictEqual(emptyTrack.isAvailable, false);

  const rawTrack = {
    title: '<img src=x onerror=alert(1)> Starboy',
    artist: 'The Weeknd & Daft Punk',
    albumArtUrl: 'https://i.scdn.co/image/abc',
    isPlaying: true,
    progressMs: 65000,
    durationMs: 230000,
    volume: 85,
    isMuted: false,
    shuffle: true,
    repeat: 'context',
    isAvailable: true
  };
  const cleanTrack = validateTrackInfo(rawTrack);
  assert.strictEqual(cleanTrack.title, '&lt;img src=x onerror=alert(1)&gt; Starboy');
  assert.strictEqual(cleanTrack.artist, 'The Weeknd &amp; Daft Punk');
  assert.strictEqual(cleanTrack.albumArtUrl, 'https://i.scdn.co/image/abc');
  assert.strictEqual(cleanTrack.isPlaying, true);
  assert.strictEqual(cleanTrack.progressMs, 65000);
  assert.strictEqual(cleanTrack.volume, 85);
  assert.strictEqual(cleanTrack.repeat, 'context');

  // 5. validateWidgetItem
  assert.deepStrictEqual(validateWidgetItem({ id: 'nowPlaying', enabled: true, order: 0 }), {
    id: 'nowPlaying',
    enabled: true,
    order: 0
  });
  assert.strictEqual(validateWidgetItem({ id: 'invalid id with spaces' }), null);
  assert.strictEqual(validateWidgetItem(null), null);

  // 6. validateWidgetsList
  const customList = [
    { id: 'quickControls', enabled: true, order: 2 },
    { id: 'nowPlaying', enabled: false, order: 0 },
    { id: 'quickControls', enabled: true, order: 5 } // duplicate
  ];
  const validatedWidgets = validateWidgetsList(customList);
  assert.strictEqual(validatedWidgets.length, 2);
  assert.strictEqual(validatedWidgets[0].id, 'nowPlaying');
  assert.strictEqual(validatedWidgets[0].order, 0);
  assert.strictEqual(validatedWidgets[1].id, 'quickControls');
  assert.strictEqual(validatedWidgets[1].order, 1);

  // Fallback on corrupt widget list
  const fallbackList = validateWidgetsList('corrupt');
  assert.strictEqual(fallbackList.length, KNOWN_WIDGET_IDS.length);

  // 7. validateSettings & getDefaultSettings
  const defs = getDefaultSettings();
  assert.strictEqual(defs.theme, 'dark');
  assert.strictEqual(defs.pollInterval, 1500);
  assert.strictEqual(defs.widgets.length, KNOWN_WIDGET_IDS.length);

  const corruptedSettings = {
    theme: 'neon-invalid',
    pollInterval: 999999,
    autoConnect: 'not-a-bool',
    widgets: 'garbage'
  };
  const repairedSettings = validateSettings(corruptedSettings);
  assert.strictEqual(repairedSettings.theme, 'dark'); // fallback to default
  assert.strictEqual(repairedSettings.pollInterval, 1500); // fallback
  assert.strictEqual(repairedSettings.autoConnect, true); // fallback
  assert.strictEqual(repairedSettings.widgets.length, KNOWN_WIDGET_IDS.length);

  // 8. validateMessage
  assert.strictEqual(validateMessage(null).isValid, false);
  assert.strictEqual(validateMessage({ action: 'MALICIOUS_CMD' }).isValid, false);
  assert.strictEqual(validateMessage({ action: 'TOGGLE_PLAY' }).isValid, true);
  assert.strictEqual(validateMessage({ action: 'NEXT_TRACK' }).isValid, true);
  assert.strictEqual(validateMessage({ action: 'SET_VOLUME', payload: { volume: 80 } }).isValid, true);

  console.log('✓ Validation and sanitization functions passed all checks');
}

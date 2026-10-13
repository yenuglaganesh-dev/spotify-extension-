import assert from 'assert';
import {
  getSettings,
  updateSettings,
  resetSettings,
  getSessionStats,
  updateSessionStats,
  resetSessionStats,
  setRaw,
  STORAGE_KEYS
} from '../modules/storage.js';

export async function runStorageTests() {
  console.log('\n--- Running Storage Persistence & Healing Tests ---');

  // 1. Initial getSettings creates and returns defaults
  await resetSettings();
  const initial = await getSettings();
  assert.ok(initial, 'Settings should not be null');
  assert.strictEqual(initial.theme, 'dark');
  assert.strictEqual(initial.pollInterval, 1500);
  assert.ok(Array.isArray(initial.widgets));

  // 2. updateSettings modifies values correctly
  const updated = await updateSettings({
    theme: 'amoled',
    pollInterval: 2000,
    notes: 'My favorite tracks: Starboy, Blinding Lights'
  });
  assert.strictEqual(updated.theme, 'amoled');
  assert.strictEqual(updated.pollInterval, 2000);
  assert.strictEqual(updated.notes, 'My favorite tracks: Starboy, Blinding Lights');

  // Verify persistence
  const reloaded = await getSettings();
  assert.strictEqual(reloaded.theme, 'amoled');
  assert.strictEqual(reloaded.notes, 'My favorite tracks: Starboy, Blinding Lights');

  // 3. Corruption healing
  await setRaw(STORAGE_KEYS.SETTINGS, {
    theme: 'invalid-theme',
    pollInterval: -100,
    widgets: 'broken'
  });
  const healed = await getSettings();
  assert.strictEqual(healed.theme, 'dark'); // healed to default
  assert.strictEqual(healed.pollInterval, 1500); // healed to default
  assert.ok(Array.isArray(healed.widgets), 'Widgets must heal to default array');

  // 4. resetSettings restores pristine defaults
  const reset = await resetSettings();
  assert.strictEqual(reset.theme, 'dark');
  assert.strictEqual(reset.notes, '');

  // 5. Session stats lifecycle
  await resetSessionStats();
  const sessionInit = await getSessionStats();
  assert.strictEqual(sessionInit.tracksPlayed, 0);

  await updateSessionStats({ tracksPlayed: 5 });
  const sessionAfter5 = await getSessionStats();
  assert.strictEqual(sessionAfter5.tracksPlayed, 5);

  await resetSessionStats();
  const sessionReset = await getSessionStats();
  assert.strictEqual(sessionReset.tracksPlayed, 0);

  console.log('✓ Storage persistence, updates, and corruption recovery verified');
}

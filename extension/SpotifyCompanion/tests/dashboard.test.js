import assert from 'assert';
import {
  DashboardManager,
  formatTime,
  formatElapsedSeconds,
  WIDGET_DEFINITIONS
} from '../modules/dashboard.js';
import { KNOWN_WIDGET_IDS } from '../modules/validation.js';

export async function runDashboardTests() {
  console.log('\n--- Running Dashboard & Widget Management Tests ---');

  // 1. Time formatting helpers
  assert.strictEqual(formatTime(0), '0:00');
  assert.strictEqual(formatTime(65000), '1:05');
  assert.strictEqual(formatTime(215000), '3:35');
  assert.strictEqual(formatTime(-500), '0:00');
  assert.strictEqual(formatTime(NaN), '0:00');

  assert.strictEqual(formatElapsedSeconds(45), '0m 45s');
  assert.strictEqual(formatElapsedSeconds(3672), '1h 01m 12s');

  // 2. Widget definitions completeness
  KNOWN_WIDGET_IDS.forEach((id) => {
    assert.ok(WIDGET_DEFINITIONS[id], `Widget ${id} must have a definition`);
    assert.ok(WIDGET_DEFINITIONS[id].title, `Widget ${id} must have a title`);
    assert.ok(WIDGET_DEFINITIONS[id].description, `Widget ${id} must have a description`);
  });

  // 3. DashboardManager initialization
  const mgr = new DashboardManager();
  const widgets = mgr.getWidgets();
  assert.strictEqual(widgets.length, KNOWN_WIDGET_IDS.length);
  assert.strictEqual(mgr.getEnabledWidgets().length, KNOWN_WIDGET_IDS.length);

  // 4. Move widget operations
  // Moving first widget up should fail
  const firstId = widgets[0].id;
  assert.strictEqual(mgr.moveWidget(firstId, 'up'), false);

  // Moving first widget down should succeed
  const secondId = widgets[1].id;
  assert.strictEqual(mgr.moveWidget(firstId, 'down'), true);
  const reordered = mgr.getWidgets();
  assert.strictEqual(reordered[0].id, secondId);
  assert.strictEqual(reordered[1].id, firstId);
  assert.strictEqual(reordered[0].order, 0);
  assert.strictEqual(reordered[1].order, 1);

  // 5. Toggle widget
  assert.strictEqual(reordered[0].enabled, true);
  mgr.toggleWidget(reordered[0].id);
  assert.strictEqual(mgr.getWidgets()[0].enabled, false);
  assert.strictEqual(mgr.getEnabledWidgets().length, KNOWN_WIDGET_IDS.length - 1);

  // Toggle back
  mgr.toggleWidget(reordered[0].id, true);
  assert.strictEqual(mgr.getWidgets()[0].enabled, true);

  // 6. Add & Remove widget
  assert.strictEqual(mgr.addWidget('custom_widget'), true);
  assert.strictEqual(mgr.getWidgets().length, KNOWN_WIDGET_IDS.length + 1);

  // Adding duplicate widget should fail
  assert.strictEqual(mgr.addWidget('custom_widget'), false);

  // Removing widget
  assert.strictEqual(mgr.removeWidget('custom_widget'), true);
  assert.strictEqual(mgr.getWidgets().length, KNOWN_WIDGET_IDS.length);
  assert.strictEqual(mgr.removeWidget('non_existent'), false);

  // 7. Reset to defaults
  mgr.resetToDefaults();
  const resetList = mgr.getWidgets();
  assert.strictEqual(resetList.length, KNOWN_WIDGET_IDS.length);
  assert.strictEqual(resetList[0].id, KNOWN_WIDGET_IDS[0]);

  console.log('✓ Dashboard manager ordering, toggles, and time helpers verified');
}

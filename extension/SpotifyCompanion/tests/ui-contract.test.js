import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { KNOWN_WIDGET_IDS } from '../modules/validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export async function runUiContractTests() {
  console.log('\n--- Running UI Contract & HTML Structure Tests ---');

  // 1. popup.html inspections
  const popupHtmlPath = path.join(projectRoot, 'popup.html');
  const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');

  // Verify key IDs referenced in popup.js
  const requiredPopupIds = [
    'connectionStatus',
    'btnOpenOptions',
    'toastNotification',
    'toastMessage',
    'disconnectedBanner',
    'btnLaunchSpotify',
    'widgetsContainer',
    'emptyWidgetsState',
    'btnConfigureWidgets',
    'btnRefreshStatus'
  ];

  requiredPopupIds.forEach((id) => {
    assert.ok(popupHtml.includes(`id="${id}"`), `popup.html must contain element with id="${id}"`);
  });

  // Verify scripts and stylesheet links
  assert.ok(popupHtml.includes('href="popup.css"'), 'popup.html must link popup.css');
  assert.ok(popupHtml.includes('src="popup.js"'), 'popup.html must link popup.js');
  assert.ok(popupHtml.includes('type="module"'), 'popup.html must load popup.js as ES module');

  // 2. options.html inspections
  const optionsHtmlPath = path.join(projectRoot, 'options.html');
  const optionsHtml = fs.readFileSync(optionsHtmlPath, 'utf8');

  const requiredOptionsIds = [
    'widgetsList',
    'btnResetWidgets',
    'selectTheme',
    'toggleCompact',
    'toggleGlow',
    'shortcutsTable',
    'btnOpenChromeShortcuts',
    'pollIntervalInput',
    'toggleSessionStats',
    'btnExportSettings',
    'btnTriggerImport',
    'fileImportSettings',
    'btnResetAll',
    'toastNotification',
    'toastMessage'
  ];

  requiredOptionsIds.forEach((id) => {
    assert.ok(optionsHtml.includes(`id="${id}"`), `options.html must contain element with id="${id}"`);
  });

  assert.ok(optionsHtml.includes('href="options.css"'), 'options.html must link options.css');
  assert.ok(optionsHtml.includes('src="options.js"'), 'options.html must link options.js');
  assert.ok(optionsHtml.includes('type="module"'), 'options.html must load options.js as ES module');

  // 3. Verify widget rendering completeness in popup.js
  const popupJs = fs.readFileSync(path.join(projectRoot, 'popup.js'), 'utf8');
  KNOWN_WIDGET_IDS.forEach((widgetId) => {
    assert.ok(popupJs.includes(`'${widgetId}'`), `popup.js must handle widget rendering for '${widgetId}'`);
  });

  // 4. Verify no background setInterval/polling in background.js
  const backgroundJs = fs.readFileSync(path.join(projectRoot, 'background.js'), 'utf8');
  assert.ok(!backgroundJs.includes('setInterval'), 'background.js must be event-driven; no background setInterval allowed');
  assert.ok(!backgroundJs.includes('eval('), 'eval() must never be used');

  // 5. Verify no eval() or remote scripts in any file
  const jsFiles = ['content.js', 'popup.js', 'options.js', 'modules/storage.js', 'modules/validation.js', 'modules/spotify-controller.js', 'modules/dashboard.js', 'modules/shortcuts.js'];
  jsFiles.forEach((file) => {
    const code = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    assert.ok(!code.includes('eval('), `${file} must not contain eval()`);
    assert.ok(!code.includes('new Function('), `${file} must not contain new Function()`);
    assert.ok(!code.includes('importScripts('), `${file} must not contain importScripts()`);
    assert.ok(!/<script\s+src=["']http/i.test(code), `${file} must not reference remote http scripts`);
  });

  console.log('✓ UI contracts, DOM IDs, and security constraints verified');
}

/**
 * Spotify Companion - Options / Settings Controller
 * Handles widget ordering, appearance themes, shortcut references, backup, and factory reset.
 */

import { getSettings, updateSettings, resetSettings } from './modules/storage.js';
import { DashboardManager, WIDGET_DEFINITIONS } from './modules/dashboard.js';
import { getActiveShortcuts, openShortcutsSettings } from './modules/shortcuts.js';
import { validateSettings } from './modules/validation.js';

let appSettings = null;
let dashboardManager = null;

// DOM Elements
const widgetsList = document.getElementById('widgetsList');
const btnResetWidgets = document.getElementById('btnResetWidgets');
const selectTheme = document.getElementById('selectTheme');
const toggleCompact = document.getElementById('toggleCompact');
const toggleGlow = document.getElementById('toggleGlow');
const shortcutsTable = document.getElementById('shortcutsTable');
const btnOpenChromeShortcuts = document.getElementById('btnOpenChromeShortcuts');
const pollIntervalInput = document.getElementById('pollIntervalInput');
const toggleSessionStats = document.getElementById('toggleSessionStats');
const btnExportSettings = document.getElementById('btnExportSettings');
const btnTriggerImport = document.getElementById('btnTriggerImport');
const fileImportSettings = document.getElementById('fileImportSettings');
const btnResetAll = document.getElementById('btnResetAll');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');

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
 * Apply theme to page
 */
function applyTheme(theme) {
  document.body.className = '';
  document.body.classList.add(`theme-${theme || 'dark'}`);
}

/**
 * Render the Widget Management list
 */
function renderWidgetsManager() {
  if (!widgetsList || !dashboardManager) return;
  widgetsList.innerHTML = '';

  const widgets = dashboardManager.getWidgets();

  widgets.forEach((widget, index) => {
    const def = WIDGET_DEFINITIONS[widget.id] || {
      id: widget.id,
      title: widget.id,
      description: 'Custom Widget'
    };

    const item = document.createElement('div');
    item.className = 'widget-config-item';
    item.setAttribute('data-id', widget.id);

    const left = document.createElement('div');
    left.className = 'widget-config-left';

    // Up / Down arrows
    const reorderBtns = document.createElement('div');
    reorderBtns.className = 'reorder-btns';

    const btnUp = document.createElement('button');
    btnUp.className = 'btn-arrow';
    btnUp.setAttribute('aria-label', `Move ${def.title} Up`);
    btnUp.disabled = index === 0;
    btnUp.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`;

    const btnDown = document.createElement('button');
    btnDown.className = 'btn-arrow';
    btnDown.setAttribute('aria-label', `Move ${def.title} Down`);
    btnDown.disabled = index === widgets.length - 1;
    btnDown.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    btnUp.addEventListener('click', async () => {
      if (dashboardManager.moveWidget(widget.id, 'up')) {
        await updateSettings({ widgets: dashboardManager.getWidgets() });
        renderWidgetsManager();
        showToast(`Moved "${def.title}" up`);
      }
    });

    btnDown.addEventListener('click', async () => {
      if (dashboardManager.moveWidget(widget.id, 'down')) {
        await updateSettings({ widgets: dashboardManager.getWidgets() });
        renderWidgetsManager();
        showToast(`Moved "${def.title}" down`);
      }
    });

    reorderBtns.appendChild(btnUp);
    reorderBtns.appendChild(btnDown);

    // Meta details
    const meta = document.createElement('div');
    meta.className = 'widget-meta';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'widget-title-span';
    titleSpan.textContent = def.title;

    const descSpan = document.createElement('span');
    descSpan.className = 'widget-desc-span';
    descSpan.textContent = def.description;

    meta.appendChild(titleSpan);
    meta.appendChild(descSpan);

    left.appendChild(reorderBtns);
    left.appendChild(meta);

    // Toggle switch
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    switchLabel.setAttribute('title', `Enable or disable ${def.title}`);

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = widget.enabled;

    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider round';

    toggleInput.addEventListener('change', async () => {
      dashboardManager.toggleWidget(widget.id, toggleInput.checked);
      await updateSettings({ widgets: dashboardManager.getWidgets() });
      showToast(`${def.title} ${toggleInput.checked ? 'enabled' : 'disabled'}`);
    });

    switchLabel.appendChild(toggleInput);
    switchLabel.appendChild(sliderSpan);

    item.appendChild(left);
    item.appendChild(switchLabel);
    widgetsList.appendChild(item);
  });
}

/**
 * Render Shortcuts Table
 */
async function renderShortcuts() {
  if (!shortcutsTable) return;
  shortcutsTable.innerHTML = '';

  const shortcuts = await getActiveShortcuts();
  shortcuts.forEach((sc) => {
    const item = document.createElement('div');
    item.className = 'shortcut-item';

    const label = document.createElement('span');
    label.className = 'shortcut-label';
    label.textContent = sc.description;

    const key = document.createElement('kbd');
    key.className = 'shortcut-key';
    key.textContent = sc.shortcut;

    item.appendChild(label);
    item.appendChild(key);
    shortcutsTable.appendChild(item);
  });
}

/**
 * Initialize page with stored preferences
 */
async function init() {
  try {
    appSettings = await getSettings();
    applyTheme(appSettings.theme);

    // 1. Setup Dashboard Manager
    dashboardManager = new DashboardManager(appSettings.widgets);
    renderWidgetsManager();

    // Reset widgets
    btnResetWidgets?.addEventListener('click', async () => {
      dashboardManager.resetToDefaults();
      await updateSettings({ widgets: dashboardManager.getWidgets() });
      renderWidgetsManager();
      showToast('Widgets restored to defaults');
    });

    // 2. Appearance controls
    if (selectTheme) {
      selectTheme.value = appSettings.theme || 'dark';
      selectTheme.addEventListener('change', async () => {
        const theme = selectTheme.value;
        applyTheme(theme);
        await updateSettings({ theme });
        showToast(`Theme changed to ${theme}`);
      });
    }

    if (toggleCompact) {
      toggleCompact.checked = Boolean(appSettings.compactMode);
      toggleCompact.addEventListener('change', async () => {
        await updateSettings({ compactMode: toggleCompact.checked });
        showToast('Compact mode updated');
      });
    }

    if (toggleGlow) {
      toggleGlow.checked = appSettings.accentGlow !== false;
      toggleGlow.addEventListener('change', async () => {
        await updateSettings({ accentGlow: toggleGlow.checked });
        showToast('Accent glow updated');
      });
    }

    // 3. Shortcuts
    await renderShortcuts();
    btnOpenChromeShortcuts?.addEventListener('click', () => {
      openShortcutsSettings();
    });

    // 4. General Settings
    if (pollIntervalInput) {
      pollIntervalInput.value = appSettings.pollInterval || 1500;
      pollIntervalInput.addEventListener('change', async () => {
        const val = Math.max(500, Math.min(10000, Number(pollIntervalInput.value) || 1500));
        pollIntervalInput.value = val;
        await updateSettings({ pollInterval: val });
        showToast(`Poll rate set to ${val}ms`);
      });
    }

    if (toggleSessionStats) {
      toggleSessionStats.checked = appSettings.trackSessionStats !== false;
      toggleSessionStats.addEventListener('change', async () => {
        await updateSettings({ trackSessionStats: toggleSessionStats.checked });
        showToast('Session tracking updated');
      });
    }

    // 5. Backup & Export
    btnExportSettings?.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appSettings, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'spotify_companion_settings.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Settings exported');
    });

    // Import
    btnTriggerImport?.addEventListener('click', () => {
      fileImportSettings?.click();
    });

    fileImportSettings?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const validated = validateSettings(parsed);
          appSettings = await updateSettings(validated);
          dashboardManager = new DashboardManager(appSettings.widgets);
          renderWidgetsManager();
          applyTheme(appSettings.theme);
          if (selectTheme) selectTheme.value = appSettings.theme;
          if (toggleCompact) toggleCompact.checked = Boolean(appSettings.compactMode);
          if (pollIntervalInput) pollIntervalInput.value = appSettings.pollInterval;
          showToast('Settings imported successfully!');
        } catch (err) {
          showToast('Invalid settings file format', true);
        }
      };
      reader.readAsText(file);
      fileImportSettings.value = '';
    });

    // Factory Reset
    btnResetAll?.addEventListener('click', async () => {
      const confirmed = window.confirm('Are you sure you want to restore all settings and widgets back to factory defaults?');
      if (confirmed) {
        appSettings = await resetSettings();
        dashboardManager = new DashboardManager(appSettings.widgets);
        renderWidgetsManager();
        applyTheme(appSettings.theme);
        if (selectTheme) selectTheme.value = appSettings.theme;
        if (toggleCompact) toggleCompact.checked = false;
        if (toggleGlow) toggleGlow.checked = true;
        if (pollIntervalInput) pollIntervalInput.value = 1500;
        if (toggleSessionStats) toggleSessionStats.checked = true;
        showToast('All settings reset to default');
      }
    });

    // 6. Navigation highlighting
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        navItems.forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  } catch (err) {
    console.error('[Options] Initialization error:', err);
    showToast('Failed to load settings', true);
  }
}

document.addEventListener('DOMContentLoaded', init);

// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcast — Electron Overlay
// Transparent, always-on-top, click-through overlay window
// that renders the HTML dashboard over the sim
// ═══════════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── App name ──────────────────────────────────────────────────
app.setName('K10 Media Broadcast');

// ── GPU / sandbox flags ─────────────────────────────────────
app.commandLine.appendSwitch('disable-gpu-sandbox');

if (process.env.K10_FORCE_SOFTWARE === '1') {
  app.disableHardwareAcceleration();
}

// ── Settings helpers ─────────────────────────────────────────
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'overlay-settings.json');
}

function loadSettingsSync() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveSettingsSync(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

// ── Window bounds persistence (green-screen mode only) ───────
function getBoundsPath() {
  return path.join(app.getPath('userData'), 'window-bounds.json');
}

function loadBounds() {
  try {
    return JSON.parse(fs.readFileSync(getBoundsPath(), 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveBounds(bounds) {
  try {
    fs.writeFileSync(getBoundsPath(), JSON.stringify(bounds));
  } catch (e) { /* non-critical */ }
}

// ── State ────────────────────────────────────────────────────
let overlayWindow = null;
let settingsMode = false;
let greenScreenMode = false;

function createOverlay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.bounds;

  // Check if green screen mode is enabled in saved settings
  const settings = loadSettingsSync();
  greenScreenMode = settings.greenScreen === true;

  const mode = greenScreenMode ? 'green-screen' : 'transparent';
  console.log(`[K10] Window mode: ${mode}`);

  if (greenScreenMode) {
    // ── Green-screen mode ──
    // Non-transparent, resizable window with chroma-key green background.
    // Window bounds are persisted so the user can size it for their OBS source.
    const saved = loadBounds();
    const defaultW = Math.round(screenW * 0.6);
    const defaultH = Math.round(screenH * 0.5);
    const defaultX = Math.round((screenW - defaultW) / 2);
    const defaultY = Math.round((screenH - defaultH) / 2);

    overlayWindow = new BrowserWindow({
      width:  saved?.width  || defaultW,
      height: saved?.height || defaultH,
      x:      saved?.x      ?? defaultX,
      y:      saved?.y      ?? defaultY,
      icon: path.join(__dirname, 'icon.png'),
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      movable: true,
      hasShadow: false,
      focusable: true,
      transparent: false,
      backgroundColor: '#00FF00',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Persist bounds on move/resize
    overlayWindow.on('moved',   () => saveBounds(overlayWindow.getBounds()));
    overlayWindow.on('resized', () => saveBounds(overlayWindow.getBounds()));

    // Green screen windows are always interactive (no click-through)
    overlayWindow.loadFile(path.join(__dirname, 'dashboard.html'));
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    // Inject opaque-mode class after page loads
    overlayWindow.webContents.on('did-finish-load', () => {
      overlayWindow.webContents.executeJavaScript(`
        document.body.classList.add('opaque-mode');
      `);
    });

  } else {
    // ── Transparent overlay mode ──
    // Fullscreen, click-through, fully transparent.
    overlayWindow = new BrowserWindow({
      width:  screenW,
      height: screenH,
      x:      0,
      y:      0,
      icon: path.join(__dirname, 'icon.png'),
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      focusable: false,
      minimizable: false,
      maximizable: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.loadFile(path.join(__dirname, 'dashboard.html'));
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  overlayWindow.on('closed', () => { overlayWindow = null; });

  // ── Crash recovery ──────────────────────────────────────────
  overlayWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[K10] Renderer crashed:', details.reason);
    if (details.reason === 'crashed' || details.reason === 'killed') {
      setTimeout(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.loadFile(path.join(__dirname, 'dashboard.html'));
        }
      }, 2000);
    }
  });

  overlayWindow.webContents.on('unresponsive', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.loadFile(path.join(__dirname, 'dashboard.html'));
    }
  });
}

// ── Settings mode ────────────────────────────────────────────
function enterSettingsMode() {
  if (!overlayWindow) return;
  settingsMode = true;
  if (!greenScreenMode) {
    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.setFocusable(true);
  }
  overlayWindow.focus();
  overlayWindow.webContents.send('settings-mode', true);
  console.log('[K10] Settings mode ON');
}

function exitSettingsMode() {
  if (!overlayWindow) return;
  settingsMode = false;
  if (!greenScreenMode) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setFocusable(false);
  }
  if (greenScreenMode) {
    saveBounds(overlayWindow.getBounds());
  }
  overlayWindow.webContents.send('settings-mode', false);
  console.log('[K10] Settings mode OFF');
}

app.whenReady().then(() => {
  console.log(`[K10] Platform: ${os.platform()} ${os.arch()} | Electron ${process.versions.electron}`);
  console.log('[K10] Hotkeys:');
  console.log('[K10]   Ctrl+Shift+S = settings mode (interact with overlay)');
  console.log('[K10]   Ctrl+Shift+G = toggle green-screen mode (restarts app)');
  console.log('[K10]   Ctrl+Shift+H = hide/show overlay');
  console.log('[K10]   Ctrl+Shift+R = reset window position/size');
  console.log('[K10]   Ctrl+Shift+Q = quit');
  createOverlay();

  // ── GLOBAL HOTKEYS ──

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) overlayWindow.hide();
      else overlayWindow.show();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (!overlayWindow) return;
    if (settingsMode) exitSettingsMode();
    else enterSettingsMode();
  });

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (!overlayWindow) return;
    const { width: sw, height: sh } = screen.getPrimaryDisplay().bounds;
    if (greenScreenMode) {
      // Reset to centered 60% × 50% window
      const w = Math.round(sw * 0.6);
      const h = Math.round(sh * 0.5);
      overlayWindow.setBounds({ x: Math.round((sw - w) / 2), y: Math.round((sh - h) / 2), width: w, height: h });
      saveBounds(overlayWindow.getBounds());
    } else {
      overlayWindow.setBounds({ x: 0, y: 0, width: sw, height: sh });
    }
    console.log('[K10] Window position/size reset');
  });

  globalShortcut.register('CommandOrControl+Shift+G', () => {
    // Toggle green-screen mode and restart
    const settings = loadSettingsSync();
    settings.greenScreen = !settings.greenScreen;
    saveSettingsSync(settings);
    const mode = settings.greenScreen ? 'green-screen' : 'transparent';
    console.log(`[K10] Toggling to ${mode} mode — restarting...`);
    app.relaunch();
    app.exit(0);
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

// ── IPC: Interactive mode (for connection banner / settings) ──
ipcMain.handle('request-interactive', async () => {
  if (!overlayWindow || greenScreenMode) return;
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setFocusable(true);
  overlayWindow.focus();
  console.log('[K10] Interactive mode ON — window accepts input');
});

ipcMain.handle('release-interactive', async () => {
  if (!overlayWindow || greenScreenMode) return;
  if (settingsMode) return;
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setFocusable(false);
  console.log('[K10] Interactive mode OFF — click-through restored');
});

// ── IPC: Settings persistence ──
ipcMain.handle('get-settings', async () => {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch (e) {
    return null;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  saveSettingsSync(settings);
  return true;
});

// ── IPC: Green screen mode query ──
ipcMain.handle('get-green-screen-mode', async () => {
  return greenScreenMode;
});

// ── IPC: Restart app (used after toggling green screen mode) ──
ipcMain.handle('restart-app', async () => {
  app.relaunch();
  app.exit(0);
});

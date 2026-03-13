// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcast — Electron Overlay
// Transparent, always-on-top, click-through overlay window
// that renders the HTML dashboard over the sim
// ═══════════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');

let overlayWindow = null;
let settingsMode = false;

function createOverlay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Click-through: mouse events pass through to the game
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load the broadcast dashboard HTML from the local copy
  overlayWindow.loadFile(path.join(__dirname, 'dashboard.html'));

  // Keep on top of fullscreen games
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  overlayWindow.on('closed', () => { overlayWindow = null; });
}

app.whenReady().then(() => {
  createOverlay();

  // ── GLOBAL HOTKEYS ──

  // Ctrl+Shift+H: Toggle overlay visibility
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) overlayWindow.hide();
      else overlayWindow.show();
    }
  });

  // Ctrl+Shift+S: Toggle settings mode (makes overlay clickable)
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (!overlayWindow) return;
    settingsMode = !settingsMode;
    if (settingsMode) {
      // Make clickable so user can interact with settings panel
      overlayWindow.setIgnoreMouseEvents(false);
      overlayWindow.setFocusable(true);
      overlayWindow.focus();
      overlayWindow.webContents.send('settings-mode', true);
    } else {
      // Return to click-through overlay
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      overlayWindow.setFocusable(false);
      overlayWindow.webContents.send('settings-mode', false);
    }
  });

  // Ctrl+Shift+Q: Quit
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

// ── IPC: Settings persistence ──
ipcMain.handle('get-settings', async () => {
  const settingsPath = path.join(app.getPath('userData'), 'overlay-settings.json');
  try {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    return null;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  const settingsPath = path.join(app.getPath('userData'), 'overlay-settings.json');
  const fs = require('fs');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return true;
});

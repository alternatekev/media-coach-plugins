// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcast — Preload Script
// Exposes safe IPC bridge to the HTML dashboard
// ═══════════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('k10', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  onSettingsMode: (callback) => {
    ipcRenderer.on('settings-mode', (event, active) => callback(active));
  },
  // Request/release interactive mode (makes window focusable + clickable)
  requestInteractive: () => ipcRenderer.invoke('request-interactive'),
  releaseInteractive: () => ipcRenderer.invoke('release-interactive'),
  // Green screen mode
  getGreenScreenMode: () => ipcRenderer.invoke('get-green-screen-mode'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
});

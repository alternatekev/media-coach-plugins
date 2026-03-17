// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcaster — Preload Script
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
  // Dashboard mode (original vs React)
  getDashboardMode: () => ipcRenderer.invoke('get-dashboard-mode'),
  toggleDashboardMode: () => ipcRenderer.invoke('toggle-dashboard-mode'),
  // Open URL in user's default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // Global hotkey listeners (forwarded from main process)
  onRestartDemo: (callback) => {
    ipcRenderer.on('restart-demo', () => callback());
  },
  onResetTrackmap: (callback) => {
    ipcRenderer.on('reset-trackmap', () => callback());
  },
  // Discord OAuth2
  discordConnect: () => ipcRenderer.invoke('discord-connect'),
  discordDisconnect: () => ipcRenderer.invoke('discord-disconnect'),
  getDiscordUser: () => ipcRenderer.invoke('get-discord-user'),
  // Remote dashboard server (iPad/tablet access)
  getRemoteServerInfo: () => ipcRenderer.invoke('get-remote-server-info'),
  startRemoteServer: (opts) => ipcRenderer.invoke('start-remote-server', opts),
  stopRemoteServer: () => ipcRenderer.invoke('stop-remote-server'),
});

/**
 * connections.ts — SimHub and Discord connection management
 * Manages connection status cards, Discord authentication, and rally mode toggle.
 */

import { state } from '../state'
import { SIMHUB_URL } from '../constants'
import { saveSettings, syncRallyToggles, updateLayoutRallyToggle } from './settings'
import { isRallyGame, applyGameMode } from './game-detect'

const DISCORD_GUILD_INVITE = 'https://discord.gg/k10mediabroadcaster'
let _discordConnecting = false

export function updateConnectionsTab() {
  updateSimhubConnectionCard()
  updateDiscordConnectionCard()
}

function updateSimhubConnectionCard() {
  const dot = document.getElementById('connSimhubDot')
  const text = document.getElementById('connSimhubText')
  const urlEl = document.getElementById('connSimhubUrl')
  const urlInput = document.getElementById('settingsSimhubUrl') as HTMLInputElement
  const currentUrl = (window as any)._simhubUrlOverride || SIMHUB_URL
  if (urlEl) urlEl.textContent = currentUrl
  if (urlInput) urlInput.value = currentUrl

  const connEl = document.getElementById('connStatus')
  const connState = connEl
    ? connEl.classList.contains('connected')
      ? 'connected'
      : connEl.classList.contains('disconnected')
        ? 'disconnected'
        : 'connecting'
    : 'connecting'

  if (dot) {
    dot.className =
      'conn-dot ' +
      (connState === 'connected' ? 'green' : connState === 'disconnected' ? 'red' : 'orange')
  }

  if (text) {
    if (connState === 'connected') text.innerHTML = '<strong>Connected</strong> — receiving telemetry'
    else if (connState === 'disconnected')
      text.innerHTML = '<strong>Disconnected</strong> — check SimHub is running'
    else text.innerHTML = 'Connecting...'
  }
}

function updateDiscordConnectionCard() {
  const notConn = document.getElementById('discordNotConnected')
  const conn = document.getElementById('discordConnected')
  if (!notConn || !conn) return

  if (state.discordUser) {
    notConn.style.display = 'none'
    conn.style.display = ''
    const nameEl = document.getElementById('discordDisplayName')
    const idEl = document.getElementById('discordUserId')
    const avatarEl = document.getElementById('discordAvatar') as HTMLImageElement
    if (nameEl) nameEl.textContent = state.discordUser.globalName || state.discordUser.username
    if (idEl) idEl.textContent = state.discordUser.id
    if (avatarEl && state.discordUser.avatar)
      avatarEl.src = `https://cdn.discordapp.com/avatars/${state.discordUser.id}/${state.discordUser.avatar}.png?size=64`
  } else {
    notConn.style.display = ''
    conn.style.display = 'none'
  }

  const gameCard = document.getElementById('gameFeatureCard')
  if (gameCard) gameCard.style.display = state.discordUser ? '' : 'none'

  updateLayoutRallyToggle()
  syncRallyToggles()
}

export async function connectDiscord() {
  if (_discordConnecting) return
  const k10 = (window as any).k10
  if (!k10 || !k10.discordConnect) {
    openDiscordInvite()
    return
  }

  _discordConnecting = true
  const btn = document.getElementById('discordConnectBtn') as HTMLButtonElement | null
  if (btn) {
    btn.disabled = true
    btn.textContent = 'Connecting...'
  }

  try {
    const result = await k10.discordConnect()
    if (result && result.success && result.user) {
      state.discordUser = result.user
      state.settings.discordUser = result.user
      saveSettings()
      updateDiscordConnectionCard()
    } else {
      const errMsg = result?.error || 'Connection failed'
      console.warn('[K10] Discord connect failed:', errMsg)
      const text = document.getElementById('connDiscordText')
      if (text) text.innerHTML = '<strong style="color:hsl(0,75%,60%)">Failed</strong> — ' + errMsg
      setTimeout(() => {
        if (text) text.innerHTML = 'Not connected'
      }, 3000)
    }
  } catch (err) {
    console.error('[K10] Discord connect error:', err)
  } finally {
    _discordConnecting = false
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<svg class="icon"><use href="#iconDiscord"></use></svg> Connect Discord'
    }
  }
}

export async function disconnectDiscord() {
  const k10 = (window as any).k10
  if (k10 && k10.discordDisconnect) await k10.discordDisconnect()
  state.discordUser = null
  delete state.settings.discordUser
  saveSettings()
  updateDiscordConnectionCard()
}

export function openDiscordInvite() {
  const k10 = (window as any).k10
  if (k10 && k10.openExternal) k10.openExternal(DISCORD_GUILD_INVITE)
  else window.open(DISCORD_GUILD_INVITE, '_blank')
}

export function toggleRallyMode(el: HTMLElement) {
  const isOn = el.classList.contains('on')
  el.classList.toggle('on', !isOn)
  state.rallyModeEnabled = !isOn
  state.settings.rallyMode = state.rallyModeEnabled
  state.isRally = isRallyGame() || state.rallyModeEnabled
  applyGameMode()
  saveSettings()
  syncRallyToggles()
}

export async function initDiscordState() {
  const k10 = (window as any).k10
  if (k10 && k10.getDiscordUser) {
    try {
      const user = await k10.getDiscordUser()
      if (user && user.id) {
        state.discordUser = user
        updateDiscordConnectionCard()
        return
      }
    } catch (e) {
      /* ok */
    }
  }

  if (state.settings.discordUser && state.settings.discordUser.id) {
    state.discordUser = state.settings.discordUser
    updateDiscordConnectionCard()
  }
}

// Register on window for HTML onclick handlers
;(window as any).connectDiscord = connectDiscord
;(window as any).disconnectDiscord = disconnectDiscord
;(window as any).openDiscordInvite = openDiscordInvite
;(window as any).toggleRallyMode = toggleRallyMode
;(window as any).updateConnectionsTab = updateConnectionsTab

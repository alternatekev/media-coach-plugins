/**
 * Shared mutable state for K10 Media Broadcaster Dashboard.
 * Replaces all `let _xxx` globals from config.js.
 *
 * All modules import this single mutable object and read/write its properties.
 * This mirrors the original global variable pattern but with explicit imports.
 */

import type { Settings } from './types'
import { DEFAULT_SETTINGS } from './constants'

export interface DashboardState {
  // Polling & connection
  pollFrame: number
  pollActive: boolean
  connFails: number
  backoffUntil: number
  hasEverConnected: boolean
  settingsForcedByDisconnect: boolean

  // Game & session state
  currentGameId: string
  isIRacing: boolean
  isRally: boolean
  rallyModeEnabled: boolean
  isIdle: boolean
  cycleFrameCount: number
  prevLap: number

  // Driver & car state
  driverDisplayName: string
  lastCarModel: string | null
  lastDriverAhead: string
  lastDriverBehind: string
  lastPosition: number
  gapsBestLap: number
  gapsLastLap: number
  gapsWorstLap: number
  gapsLapNum: number
  gapsNonRaceMode: boolean
  startPosition: number
  prevBB: number
  prevTC: number
  prevABS: number
  clutchSeenActive: boolean
  clutchHidden: boolean

  // Telemetry history
  thrHist: number[]
  brkHist: number[]
  cltHist: number[]

  // Flag & race control
  lastFlagState: string
  greenFlagTimeout: ReturnType<typeof setTimeout> | null
  rcTimeout: ReturnType<typeof setTimeout> | null
  rcVisible: boolean
  flagHoldUntil: number
  flagHoldState: string
  prevCheckered: boolean
  forceFlagState: string

  // Race end screen
  raceEndVisible: boolean
  raceEndTimer: ReturnType<typeof setTimeout> | null

  // Timer & UI
  timerHideTimeout: ReturnType<typeof setTimeout> | null
  timerPinned: boolean
  commentaryWasVisible: boolean
  tcSeen: boolean
  absSeen: boolean
  carAdj: { noBB: boolean; noABS: boolean; noTC: boolean } | null

  // Grid / Formation
  gridActive: boolean
  gridLightsPhase: number
  gridPrevSessionState: number
  gridFadeTimer: ReturnType<typeof setTimeout> | null

  // Settings & Discord
  settings: Settings
  discordUser: any | null

  // Logo cycling
  currentCarLogoIdx: number
  currentCarLogo: string
  logoCycleTimer: ReturnType<typeof setInterval> | null

  // UI panel state
  ratingPos: number
}

export const state: DashboardState = {
  // Polling & connection
  pollFrame: 0,
  pollActive: false,
  connFails: 0,
  backoffUntil: 0,
  hasEverConnected: false,
  settingsForcedByDisconnect: false,

  // Game & session state
  currentGameId: '',
  isIRacing: true,
  isRally: false,
  rallyModeEnabled: false,
  isIdle: true,
  cycleFrameCount: 0,
  prevLap: 0,

  // Driver & car state
  driverDisplayName: 'YOU',
  lastCarModel: null,
  lastDriverAhead: '',
  lastDriverBehind: '',
  lastPosition: 0,
  gapsBestLap: 0,
  gapsLastLap: 0,
  gapsWorstLap: 0,
  gapsLapNum: 0,
  gapsNonRaceMode: false,
  startPosition: 0,
  prevBB: -1,
  prevTC: -1,
  prevABS: -1,
  clutchSeenActive: false,
  clutchHidden: false,

  // Telemetry history
  thrHist: new Array(20).fill(0),
  brkHist: new Array(20).fill(0),
  cltHist: new Array(20).fill(0),

  // Flag & race control
  lastFlagState: 'none',
  greenFlagTimeout: null,
  rcTimeout: null,
  rcVisible: false,
  flagHoldUntil: 0,
  flagHoldState: 'none',
  prevCheckered: false,
  forceFlagState: '',

  // Race end screen
  raceEndVisible: false,
  raceEndTimer: null,

  // Timer & UI
  timerHideTimeout: null,
  timerPinned: false,
  commentaryWasVisible: false,
  tcSeen: false,
  absSeen: false,
  carAdj: null,

  // Grid / Formation
  gridActive: false,
  gridLightsPhase: 0,
  gridPrevSessionState: 4,
  gridFadeTimer: null,

  // Settings & Discord
  settings: Object.assign({}, DEFAULT_SETTINGS),
  discordUser: null,

  // Logo cycling
  currentCarLogoIdx: 0,
  currentCarLogo: '',
  logoCycleTimer: null,

  // UI panel state
  ratingPos: 0,
}

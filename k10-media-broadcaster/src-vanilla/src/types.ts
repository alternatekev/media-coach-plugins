/**
 * TypeScript types for K10 Media Broadcaster Dashboard.
 */

export interface Settings {
  showFuel: boolean
  showTyres: boolean
  showControls: boolean
  showPedals: boolean
  showMaps: boolean
  showPosition: boolean
  showTacho: boolean
  showCommentary: boolean
  showK10Logo: boolean
  showCarLogo: boolean
  simhubUrl: string
  layoutPosition: string
  layoutFlow: string
  verticalSwap: boolean
  greenScreen: boolean
  showWebGL: boolean
  showBonkers: boolean
  zoom: number
  forceFlag: string
  showLeaderboard: boolean
  showDatastream: boolean
  showIncidents: boolean
  showSpotter: boolean
  incPenalty: number
  incDQ: number
  secLayout: string
  secOffsetX: number
  secOffsetY: number
  secVOppose: boolean
  secHOppose: boolean
  discordUser: any | null
  rallyMode: boolean
}

export interface GameFeatures {
  hasIRating: boolean
  hasIncidents: boolean
  hasFlags: boolean
  hasFormation: boolean
  hasDRS: boolean
  hasERS: boolean
}

export interface CarAdjustability {
  match: string
  noBB: boolean
  noABS: boolean
  noTC: boolean
}

export interface MfrBrandColors {
  [key: string]: string
}

export interface PropMap {
  [key: string]: any
}

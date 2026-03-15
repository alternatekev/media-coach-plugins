/**
 * Main Dashboard layout — composes all HUD components in the correct grid.
 *
 * Grid structure (RTL flow, default):
 *   ┌─────────────────────────────────────────┬──────────┐
 *   │ main-row                                │ comment  │
 *   │  ┌──────┬──────┬──────┬──────┬────┬───┐ │ col      │
 *   │  │Fuel  │Ctrls │Maps  │Pos   │Tach│Logo│          │
 *   │  │Tyres │Pedal │      │Gaps  │    │    │          │
 *   │  └──────┴──────┴──────┴──────┴────┴───┘ │          │
 *   ├─────────────────────────────────────────┤          │
 *   │ timer-row                               │          │
 *   └─────────────────────────────────────────┴──────────┘
 *
 * Secondary panels (leaderboard, datastream, incidents, spotter) are
 * fixed-positioned on the opposite side of the viewport from the HUD.
 *
 * Overlay banners (race control, pit limiter) are full-width fixed at
 * top/bottom of viewport.
 */
import { useSettings } from '@hooks/useSettings'
import { useTelemetry } from '@hooks/useTelemetry'
import styles from '../../styles/dashboard.module.css'

// HUD components
import { Tachometer } from '@components/hud/tachometer/Tachometer'
import { FuelPanel } from '@components/hud/fuel/FuelPanel'
import { TyresPanel } from '@components/hud/tyres/TyresPanel'
import PedalsPanel from '@components/hud/PedalsPanel'
import ControlsPanel from '@components/hud/ControlsPanel'
import PositionPanel from '@components/hud/PositionPanel'
import GapsPanel from '@components/hud/GapsPanel'
import LogoPanel from '@components/hud/LogoPanel'
import CommentaryPanel from '@components/hud/CommentaryPanel'

// Secondary panels
import LeaderboardPanel from '@components/panels/LeaderboardPanel'
import DatastreamPanel from '@components/panels/DatastreamPanel'
import IncidentsPanel from '@components/panels/IncidentsPanel'
import SpotterPanel from '@components/panels/SpotterPanel'

// Overlays
import RaceControlBanner from '@components/overlays/RaceControlBanner'
import PitLimiterBanner from '@components/overlays/PitLimiterBanner'
import RaceEndScreen from '@components/overlays/RaceEndScreen'
import { SettingsPanel } from '@components/settings/SettingsPanel'

const LAYOUT_MAP: Record<string, string> = {
  'top-right': 'layout-tr',
  'top-left': 'layout-tl',
  'bottom-right': 'layout-br',
  'bottom-left': 'layout-bl',
  'top-center': 'layout-tc',
  'bottom-center': 'layout-bc',
}

export default function Dashboard() {
  const { settings } = useSettings()
  const { telemetry } = useTelemetry()

  const sessionNum = parseInt(telemetry.sessionState) || 0
  const isIdle = !telemetry.gameRunning || sessionNum <= 1

  // Idle state: show only K10 logo at 50% size and 50% opacity
  if (isIdle) {
    return (
      <>
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.5)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}>
          <LogoPanel idleMode />
        </div>
        <SettingsPanel />
      </>
    )
  }

  const layoutClass = LAYOUT_MAP[settings.layoutPosition] || 'layout-tr'
  const flowClass = `flow-${settings.layoutFlow || 'rtl'}`
  const vswapClass = settings.verticalSwap ? 'vswap' : ''

  const dashClasses = [
    styles.dashboard,
    layoutClass,
    flowClass,
    vswapClass,
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* ── Main HUD Dashboard ── */}
      <div className={dashClasses} id="dashboard">
        {/* Main row: all HUD columns */}
        <div className={styles['main-row']}>
          <div className="main-area">

            {/* COL: Fuel (top) + Tyres (bottom) */}
            {(settings.showFuel || settings.showTyres) && (
              <div className="fuel-tyres-col">
                {settings.showFuel && <FuelPanel />}
                {settings.showTyres && <TyresPanel />}
              </div>
            )}

            {/* COL: Controls + Pedals */}
            {(settings.showControls || settings.showPedals) && (
              <div className="controls-pedals-block">
                {settings.showControls && <ControlsPanel />}
                {settings.showPedals && <PedalsPanel />}
              </div>
            )}

            {/* COL: Maps — placeholder for TrackMap component */}
            {settings.showMaps && (
              <div className="maps-col">
                <div className="panel map-panel">
                  <svg className="map-svg" viewBox="0 0 100 100">
                    <path className="map-track" d="" />
                    <circle className="map-player" cx="50" cy="50" r="4" />
                  </svg>
                </div>
                <div className="panel map-zoom-panel">
                  <svg className="map-zoom-svg" viewBox="0 0 100 100">
                    <path className="map-track" d="" style={{ strokeWidth: 1.5 }} />
                    <circle className="map-player" cx="50" cy="50" r="2" />
                  </svg>
                </div>
              </div>
            )}

            {/* COL: Position/Rating + Gaps */}
            {settings.showPosition && (
              <div className="pos-gaps-col">
                <PositionPanel />
                <GapsPanel />
              </div>
            )}

            {/* COL: Tachometer */}
            {settings.showTacho && <Tachometer />}

            {/* COL: Logo (two stacked squares) */}
            {(settings.showK10Logo || settings.showCarLogo) && <LogoPanel />}
          </div>
        </div>

        {/* Timer row — placeholder for RaceTimer component */}
        <div className={styles['timer-row']} />

        {/* Commentary column */}
        {settings.showCommentary && <CommentaryPanel />}
      </div>

      {/* ── Secondary Panels (fixed-positioned, opposite side) ── */}
      {settings.showLeaderboard && <LeaderboardPanel />}
      {settings.showDatastream && <DatastreamPanel />}
      {settings.showIncidents && <IncidentsPanel />}
      <SpotterPanel />

      {/* ── Full-width Overlay Banners ── */}
      <RaceControlBanner />
      <PitLimiterBanner />
      <RaceEndScreen />
      <SettingsPanel />
    </>
  )
}

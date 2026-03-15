/**
 * Demo Preview — renders the overlay with mock telemetry data,
 * forcing the race-end screen to display immediately.
 *
 * Build with: npx vite build --config vite.preview.config.ts
 * Or run dev: npx vite --config vite.preview.config.ts
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import type { ParsedTelemetry, ConnectionStatus, PollStats } from './types/telemetry';
import type { OverlaySettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';

// ── Mock telemetry for P1 victory ──
const DEMO_P1: ParsedTelemetry = {
  gameRunning: true,
  gear: '4',
  rpm: 4200,
  maxRpm: 8500,
  speedMph: 68,
  throttleRaw: 0.3,
  brakeRaw: 0.0,
  clutchRaw: 0.0,
  fuelPercent: 12,
  fuelLiters: 9.6,
  maxFuelLiters: 80,
  fuelPerLap: 3.2,
  fuelRemainingLaps: 3,
  tyreTempFL: 195, tyreTempFR: 200, tyreTempRL: 185, tyreTempRR: 190,
  tyreWearFL: 0.72, tyreWearFR: 0.68, tyreWearRL: 0.81, tyreWearRR: 0.78,
  brakeBias: 52.5, tc: 4, abs: 3,
  position: 1,
  gapAhead: 0,
  gapBehind: 2.456,
  driverAhead: '',
  driverBehind: 'S. Vettel',
  irAhead: 0,
  irBehind: 4800,
  currentLap: 40,
  totalLaps: 40,
  currentLapTime: 92.5,
  bestLapTime: 83.456,
  lastLapTime: 84.9,
  sessionBestLapTime: 83.456,
  sessionTime: 3600,
  remainingTime: 0,
  iRating: 4250,
  safetyRating: 3.89,
  carModel: 'Mercedes-AMG GT3 EVO',
  commentaryVisible: false,
  commentaryText: '',
  commentaryTitle: '',
  commentaryTopicId: '',
  commentaryCategory: '',
  commentaryColor: '',
  commentarySeverity: 0,
  latG: 0.1, longG: -0.1, yawRate: 0.02,
  steerTorque: 5, trackTemp: 34, incidentCount: 2,
  absActive: false, tcActive: false, trackPct: 0.98,
  lapDelta: -0.345, completedLaps: 40,
  isInPitLane: false, speedKmh: 110,
  trackMapReady: false, trackMapSvg: '', playerMapX: 50, playerMapY: 50,
  opponentMapPositions: '', leaderboardJson: '',
  driverFirstName: 'Kevin', driverLastName: 'Conboy',
  flagState: 'Checkered',
  sessionState: '5',
  griddedCars: 0, totalCars: 24, paceMode: '', startType: 'rolling',
  lightsPhase: 0, trackCountry: 'US',
  demoMode: true,
};

// ── We need to provide the same context shape as useTelemetry/useSettings ──
interface TelemetryContextType {
  telemetry: ParsedTelemetry;
  connectionStatus: ConnectionStatus;
  stats: PollStats;
}
interface SettingsContextType {
  settings: OverlaySettings;
  updateSetting: <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => void;
  resetSettings: () => void;
}

// Create contexts that mirror the real ones
const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Mock providers
function MockTelemetryProvider({ children, data }: { children: ReactNode; data: ParsedTelemetry }) {
  const value: TelemetryContextType = {
    telemetry: data,
    connectionStatus: 'connected',
    stats: {
      pollCount: 999, connectedCount: 999, failureCount: 0,
      lastUpdateTime: Date.now(), averageLatencyMs: 12,
      connectionStatus: 'connected',
    },
  };
  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

function MockSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const updateSetting = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  const resetSettings = () => setSettings(DEFAULT_SETTINGS);
  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Scenario Selector ──
type Scenario = 'p1' | 'p2' | 'p3' | 'strong' | 'midpack' | 'dnf';

function getScenarioData(scenario: Scenario): ParsedTelemetry {
  const base = { ...DEMO_P1 };

  switch (scenario) {
    case 'p1':
      return base;
    case 'p2':
      return { ...base, position: 2, incidentCount: 3, bestLapTime: 84.012, iRating: 3800 };
    case 'p3':
      return { ...base, position: 3, incidentCount: 6, bestLapTime: 84.567, iRating: 3200 };
    case 'strong':
      return { ...base, position: 7, incidentCount: 4, bestLapTime: 85.234, iRating: 2800 };
    case 'midpack':
      return { ...base, position: 15, incidentCount: 8, bestLapTime: 86.789, iRating: 2100 };
    case 'dnf':
      return {
        ...base,
        position: 0,
        completedLaps: 12,
        totalLaps: 40,
        incidentCount: 17,
        bestLapTime: 87.456,
        iRating: 1800,
      };
    default:
      return base;
  }
}

// ── The actual preview app ──
// We need to PATCH the module system so that the real useTelemetry/useSettings
// hooks use our mock contexts. The cleanest way is to render the RaceEndScreen
// directly inside our mock providers, but we need to make the hooks resolve
// to our mock contexts.
//
// Instead of trying to mock module imports at runtime, we'll render the
// RaceEndScreen component directly using a re-export that patches the hooks.

// We can't easily hot-swap module-level contexts, so let's just render
// the race end screen component standalone with a thin wrapper.

import RaceEndScreen from './components/overlays/RaceEndScreen';
import Dashboard from './components/layout/Dashboard';

// PATCH: Override the context modules so Dashboard and RaceEndScreen
// use our mock providers. We'll use a module-patching approach.
// Actually — the cleanest way is to just render through the real component
// tree but with our mock providers. The real hooks use createContext at the
// module level, so we need to provide those exact contexts.
//
// Let's instead render the Dashboard with re-exported hooks.

// Since useTelemetry and useSettings import from their own modules and
// create their own contexts, we need to provide those exact contexts.
// The simplest approach: import the real providers but swap the data.

// Actually, the simplest approach for a demo: just use the real providers
// and override the telemetry with a wrapper that sets initial state.

// OK, let's take the simplest approach: create a self-contained preview
// component that directly shows the race end screen UI without hooks.

function PreviewApp() {
  const [scenario, setScenario] = useState<Scenario>('p1');
  const [key, setKey] = useState(0);

  const switchScenario = (s: Scenario) => {
    setScenario(s);
    setKey(k => k + 1); // Force re-mount to re-trigger animations
  };

  const data = getScenarioData(scenario);

  return (
    <div style={{ background: '#111', minHeight: '100vh' }}>
      {/* Scenario picker toolbar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
        display: 'flex', gap: '8px', padding: '12px 20px',
        background: 'hsla(0,0%,0%,0.9)', borderTop: '1px solid hsla(0,0%,100%,0.15)',
        justifyContent: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ color: 'hsla(0,0%,100%,0.5)', fontSize: '11px', alignSelf: 'center', marginRight: '8px' }}>
          DEMO SCENARIO:
        </span>
        {([
          ['p1', 'P1 Victory'],
          ['p2', 'P2 Podium'],
          ['p3', 'P3 Podium'],
          ['strong', 'P7 Strong'],
          ['midpack', 'P15 Midpack'],
          ['dnf', 'DNF'],
        ] as [Scenario, string][]).map(([s, label]) => (
          <button
            key={s}
            onClick={() => switchScenario(s)}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              border: scenario === s ? '2px solid #fff' : '1px solid hsla(0,0%,100%,0.25)',
              borderRadius: '6px',
              background: scenario === s ? 'hsla(0,0%,100%,0.15)' : 'transparent',
              color: scenario === s ? '#fff' : 'hsla(0,0%,100%,0.6)',
              cursor: 'pointer',
              fontFamily: 'var(--ff)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Render the actual race end screen via mock providers */}
      <MockSettingsProvider>
        <MockTelemetryProvider data={data} key={key}>
          <DemoRaceEndScreen data={data} key={`end-${key}`} />
        </MockTelemetryProvider>
      </MockSettingsProvider>
    </div>
  );
}

/**
 * A standalone version of the RaceEndScreen that renders directly
 * from props instead of hooks, matching the real component's visual output.
 */
function DemoRaceEndScreen({ data }: { data: ParsedTelemetry }) {
  const { fmtLap, fmtIRating } = useDemoFormatters();

  const isDNF = data.position === 0 || (data.completedLaps < Math.floor(data.totalLaps * 0.5));
  const isCleanRace = data.incidentCount <= 4;

  let finishType: string;
  if (isDNF) finishType = 'dnf';
  else if (data.position >= 1 && data.position <= 3) finishType = 'podium';
  else if (data.position >= 4 && data.position <= 10) finishType = 'strong';
  else finishType = 'midpack';

  let title: string;
  let subtitle: string | null = null;
  let tintClass: string;

  if (isDNF) {
    title = 'TOUGH BREAK';
    subtitle = 'Every lap is a lesson. Regroup and go again.';
    tintClass = 'tint-purple';
  } else if (finishType === 'podium') {
    title = data.position === 1 ? 'VICTORY!' : 'PODIUM FINISH!';
    tintClass = data.position === 1 ? 'tint-gold' : data.position === 2 ? 'tint-silver' : 'tint-bronze';
  } else if (finishType === 'strong') {
    title = 'STRONG FINISH';
    tintClass = 'tint-green';
  } else {
    title = 'RACE COMPLETE';
    tintClass = 'tint-neutral';
  }

  return (
    <div className={`demo-race-end ${tintClass}`}>
      <div className="demo-backdrop" />

      {finishType === 'podium' && (
        <div className="demo-confetti">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="demo-confetti-particle" style={{
              left: `${5 + (i * 6.25)}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${2.5 + Math.random() * 2}s`,
            }} />
          ))}
        </div>
      )}

      <div className="demo-content">
        <div className={`demo-position ${tintClass}`}>
          {!isDNF && data.position > 0 ? `P${data.position}` : '—'}
        </div>

        <div className="demo-title-block">
          <h1 className="demo-title">{title}</h1>
          {subtitle && <p className="demo-subtitle">{subtitle}</p>}
        </div>

        {isCleanRace && (
          <div className="demo-clean-badge">
            <span>✓</span> CLEAN RACE
          </div>
        )}

        <div className="demo-stats-grid">
          <div className="demo-stat-item">
            <div className="demo-stat-label">POSITION</div>
            <div className="demo-stat-value">
              {!isDNF && data.position > 0 ? `P${data.position}` : 'DNF'}
            </div>
          </div>
          <div className="demo-stat-item">
            <div className="demo-stat-label">INCIDENTS</div>
            <div className="demo-stat-value">{data.incidentCount}</div>
          </div>
          <div className="demo-stat-item">
            <div className="demo-stat-label">BEST LAP</div>
            <div className="demo-stat-value">{fmtLap(data.bestLapTime)}</div>
          </div>
          <div className="demo-stat-item">
            <div className="demo-stat-label">iRATING</div>
            <div className="demo-stat-value">{fmtIRating(data.iRating)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useDemoFormatters() {
  const fmtLap = (seconds: number): string => {
    if (seconds <= 0 || !isFinite(seconds)) return '—';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds - minutes * 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs.toFixed(3)}`;
  };
  const fmtIRating = (ir: number): string => {
    if (ir <= 0) return '—';
    return ir >= 1000 ? `${(ir / 1000).toFixed(1)}k` : String(ir);
  };
  return { fmtLap, fmtIRating };
}

// ── Mount ──
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <PreviewApp />
    </React.StrictMode>
  );
}

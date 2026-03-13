# K10 Media Broadcast — Dashboard Overlay

A standalone Electron overlay that renders real-time sim racing telemetry as a transparent HUD on top of your sim. Designed for stream overlays and broadcast production — it composites directly over the game window with no capture card or secondary monitor required.

![Dashboard Screenshot](../docs/dashboard-screenshot.png)

## Overview

The dashboard connects to the K10 Media Coach SimHub plugin's HTTP API and renders telemetry data at ~30fps. It runs as a frameless, always-on-top, click-through window so the game receives all mouse and keyboard input normally. On systems that support native transparency (x64 Windows), the window background is fully transparent. On ARM devices (Surface Pro, Snapdragon laptops), it uses a green chroma key background for OBS Color Key compositing.

The same `dashboard.html` file powers three deployment modes: the Electron overlay (this app), the SimHub built-in dashboard template, and direct browser access via the plugin's HTTP server.

## Quick Start

### Prerequisites

- Node.js 18+
- SimHub running with the K10 Media Coach plugin enabled
- The plugin's HTTP server active on port 8889 (starts automatically with the plugin)

### Install and Run

```bash
cd "simhub-plugin/K10 Media Broadcast"
npm install
npm start
```

The overlay appears in the top-right corner of your primary display. If you see a crash on ARM hardware, use the safe mode launcher:

```bash
npm run start:safe
```

### Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Toggle settings/move mode — drag the overlay to reposition, resize from edges |
| `Ctrl+Shift+H` | Hide or show the overlay |
| `Ctrl+Shift+R` | Reset overlay position and size to defaults |
| `Ctrl+Shift+Q` | Quit the overlay |

## Dashboard Panels

The HUD is organized as a compact horizontal strip with the following panels, reading right to left:

### Logo Column

Two stacked squares showing the K10 logomark (top) and the detected manufacturer logo (bottom). The manufacturer auto-detects from the car model name — Porsche, BMW, Ferrari, McLaren, Mazda, Nissan, and Dallara are supported with custom emblems. Unknown manufacturers show a generic racing flag.

### Tachometer and Speed

Large gear indicator (top-left), RPM readout (top-right), speed in MPH below. The tachometer bar segments along the bottom fill from green through yellow to red as RPM approaches the redline. The bar flashes when RPM exceeds 95% of max.

### Rating and Gaps (Cycling)

This panel cycles between two pages every 45 seconds:

**Page 1 — iRating and Safety Rating:** iRating as a numeric value with a horizontal fill bar (scaled 0–5000). Safety Rating as a numeric value with a circular progress indicator (scaled 0–4.00).

**Page 2 — Position and Gaps:** Current race position prominently displayed. Gap to the car ahead (negative seconds) and behind (positive seconds), with driver names and iRating values. Gap values flash green on overtakes and red when losing positions.

### Track Map

A miniature track outline rendered from the plugin's SVG path data. The player's car appears as a bright dot, opponents as smaller dim dots. The map auto-scales to fit the panel and rotates to match the track's natural orientation. Only appears when track map data is available from the plugin.

### Pedal Traces

Three side-by-side histogram columns showing throttle (green), brake (red), and clutch (blue) input traces. Each histogram is a rolling 20-sample window, giving a visual history of recent pedal inputs. Current percentage is displayed above each column.

### Controls (BB / TC / ABS)

Brake bias percentage, traction control level, and ABS level. Each shows a numeric value with a small vertical fill indicator. TC and ABS panels auto-hide if the current car doesn't expose those telemetry channels (they appear once a non-zero value is detected).

### Fuel

Current fuel level in liters with a horizontal bar (color transitions from green to amber to red as fuel depletes). Below: average fuel consumption per lap and estimated laps remaining. A "PIT in ~N laps" warning appears when fuel won't last the remaining race distance.

### Tyres

A 2×2 grid showing all four tyre temperatures in °F. Each cell background colors from blue (cold) through green (optimal) to red (overheating), based on temperature thresholds. Tyre wear percentage drives the cell opacity — worn tyres appear more muted.

### Commentary

An expandable panel that slides in from the left when the commentary engine fires an event. Shows the topic title, commentary text, and category label. The panel border and background tint match the event's sentiment color (orange for warnings, red for critical, blue for informational). The panel auto-dismisses when the plugin clears the commentary visibility flag.

## Architecture

```
┌─────────────────────────────────────┐
│  SimHub + K10 Media Coach Plugin    │
│  ┌────────────────────────────────┐ │
│  │ HTTP Server (port 8889)        │ │
│  │ GET /k10mediacoach/            │ │
│  │ → flat JSON: 77+ properties    │ │
│  └────────────────────────────────┘ │
└──────────────────┬──────────────────┘
                   │ HTTP GET (~30fps)
┌──────────────────▼──────────────────┐
│  K10 Media Broadcast (Electron)     │
│  ┌────────────────────────────────┐ │
│  │ main.js         (main process) │ │
│  │ • Window management            │ │
│  │ • Transparency / chroma key    │ │
│  │ • Settings persistence (IPC)   │ │
│  │ • Global hotkeys               │ │
│  │ • Crash recovery               │ │
│  ├────────────────────────────────┤ │
│  │ preload.js      (context bridge)│ │
│  │ • k10.getSettings()            │ │
│  │ • k10.saveSettings()           │ │
│  │ • k10.onSettingsMode()         │ │
│  ├────────────────────────────────┤ │
│  │ dashboard.html   (renderer)    │ │
│  │ • All CSS + layout             │ │
│  │ • Polling loop (fetchProps)    │ │
│  │ • Data rendering functions     │ │
│  │ • Settings overlay UI          │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Data Flow

1. The SimHub plugin runs an `HttpListener` on port 8889 that serves all telemetry and commentary state as a flat JSON object at `/k10mediacoach/`.

2. The dashboard's `fetchProps()` function issues a single HTTP GET every 33ms (~30fps). When the plugin is in demo mode, the dashboard reads from `K10MediaCoach.Plugin.Demo.*` properties instead of `DataCorePlugin.GameData.*` properties — the switching is transparent.

3. Each poll cycle, `pollUpdate()` maps the JSON values to DOM elements: updating text content, CSS custom properties, SVG transforms, and class toggles. Animations (tachometer color, commentary slide-in, gap flashes) are handled by CSS transitions triggered by class changes.

4. The connection uses exponential backoff on failure (1s, 2s, 4s, 8s, capped at 10s) to avoid socket exhaustion when SimHub isn't running.

### Files

| File | Purpose |
|------|---------|
| `main.js` | Electron main process — window creation, transparency, hotkeys, IPC, crash recovery |
| `preload.js` | Context bridge — exposes settings IPC to the renderer securely |
| `dashboard.html` | Complete dashboard — CSS, HTML layout, and all JavaScript in a single file |
| `logomark.png` | K10 logomark image |
| `package.json` | Node.js manifest with `start`, `dev`, and `start:safe` scripts |

## Configuration

### In-App Settings

Press `Ctrl+Shift+S` to enter settings mode, then click the gear icon to open the settings panel. Toggle individual dashboard sections on or off:

- Fuel gauge
- Tyre temperatures
- Car controls (BB/TC/ABS)
- Pedal traces
- Track map
- Position and gaps
- Tachometer
- Commentary panel
- K10 logo
- Car manufacturer logo

You can also change the SimHub API URL if the plugin is running on a different machine (e.g., `http://playbox.local:8889/k10mediacoach`).

Settings persist between sessions — they're saved via Electron IPC to a JSON file in the app's user data directory, with a localStorage fallback when running in a browser.

### Layout Position

The settings panel includes a **Position** dropdown that places the dashboard in any screen corner or centered along the top/bottom edge:

| Position | Logo Side | Commentary Side |
|----------|-----------|-----------------|
| Top Right (default) | Right edge | Extends left |
| Top Left | Left edge | Extends right |
| Bottom Right | Right edge | Extends left, grows upward |
| Bottom Left | Left edge | Extends right, grows upward |
| Top Center | Depends on flow | Depends on flow |
| Bottom Center | Depends on flow | Depends on flow, grows upward |

For center positions, a **Flow Direction** selector appears — choose "Left to Right" (logo on left, content flows right) or "Right to Left" (logo on right, content flows left). Corner positions determine flow automatically based on which side of the screen the dashboard occupies.

The **Swap Vertical** toggle reverses the top and bottom halves of all stacked panel columns. When enabled, tyres move above fuel, pedal traces above car controls, gaps above iRating/Safety, and the car logo above the K10 logo. This is useful when you want specific data closer to the screen edge — for example, placing tyre temps in the top row when the dashboard is at the bottom of the screen so they're closest to the game view. Single-height panels (the tachometer) are unaffected.

### Window Position

In settings mode (`Ctrl+Shift+S`), drag the overlay anywhere on screen and resize it from the edges. The position and size persist between sessions. Use `Ctrl+Shift+R` to reset to the default position (top-right corner).

## ARM Compatibility

On ARM64 Windows devices (Qualcomm Snapdragon, Microsoft SQ processors), Chromium's native transparency is broken due to GPU compositor limitations. The overlay automatically detects ARM and switches to chroma key mode:

- Window background becomes `#00FF00` (green)
- Panel backgrounds switch to solid (no blur/transparency)
- Hardware acceleration is disabled
- The `--no-sandbox` flag is applied (required for Chromium on ARM)

### OBS Setup for ARM

1. Add a **Window Capture** source pointing to the K10 Media Broadcast window
2. Right-click the source → **Filters**
3. Add **Color Key** filter
4. Set key color to green (`#00FF00`)
5. Adjust similarity and smoothness until the green background is fully transparent

On x64 systems, the overlay uses native transparency and composites directly — no OBS filter needed.

## Deployment Modes

### Electron Overlay (Primary)

The standalone Electron app described in this document. Best for streaming and broadcast — always on top, click-through, with hotkey controls.

### SimHub Dashboard Template

The same `dashboard.html` is installed as a SimHub dashboard template (in `DashTemplates/k10 media broadcast/`). When opened inside SimHub's dashboard viewer, it uses SimHub's `$prop()` API for data instead of HTTP polling. No Electron needed — SimHub handles the rendering.

### Browser Access

Open `dashboard.html` directly in any browser while SimHub and the plugin are running. The dashboard auto-detects that it's not inside SimHub and falls back to HTTP polling mode. Useful for testing or for rendering on a second machine.

## Troubleshooting

**Dashboard shows no data:** Verify the plugin's HTTP server is running — open `http://localhost:8889/k10mediacoach/` in a browser. You should see a JSON blob with 77+ properties. If not, check that the K10 Media Coach plugin is enabled in SimHub.

**Overlay crashes on launch (ARM):** Use `npm run start:safe` which forces software rendering. If that still fails, check that you're running Electron 33+ which includes the ARM compatibility fixes.

**Commentary panel never appears:** Enable Demo Mode in the SimHub plugin settings to trigger test commentary events. The commentary panel only slides in when `K10MediaCoach.Plugin.CommentaryVisible` is set to 1 by the engine.

**Overlay covers clicks:** The overlay should be click-through by default. If you accidentally entered settings mode (`Ctrl+Shift+S`), press `Ctrl+Shift+S` again to lock the overlay and restore click-through behavior.

**OBS shows black/solid overlay:** On x64, make sure you're using **Game Capture** or **Window Capture** with "Allow Transparency" enabled. On ARM, use the Color Key filter approach described above.

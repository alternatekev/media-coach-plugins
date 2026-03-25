<p align="center">
  <img src="src/images/logomark.png" alt="K10 Media Broadcaster" width="200">
</p>

# K10 Media Broadcaster

![Dashboard](simhub-plugin/docs/dashboard-screenshot.png)

Two plugins that work together: a **SimHub plugin** that generates real-time commentary prompts from sim racing telemetry, and a **Homebridge plugin** that drives Apple HomeKit smart lights from the same data. The SimHub plugin watches what happens on track — spins, overtakes, tyre wear, flag changes, close battles — and surfaces contextual commentary on a dashboard overlay. The Homebridge plugin translates that telemetry into light colors, so your room reacts to what's happening in the race.

Built for iRacing with cross-game fallback support via SimHub's telemetry abstraction.

## What It Does

### SimHub Commentary Plugin

The plugin evaluates 33 telemetry-driven trigger conditions at ~100ms intervals during a sim session. When a condition fires (spin detected, position gained, tyres overheating, yellow flag), it assembles a commentary prompt from composable sentence fragments and displays it on a SimHub dashboard overlay. Severity-based interruption ensures catastrophic events (wall contact, black flag) override lower-priority observations. A cooldown system prevents prompt spam.

The prompts are written in first person, present tense, technically grounded — matching the voice of a working sim racer talking through what's happening on track.

### Homebridge HomeKit Light Plugin

The companion plugin reads the same telemetry properties via SimHub's HTTP API and translates them into HomeKit light colors: flags as colored lights, severity as brightness, proximity as red/orange warning indicators. Multiple lights can run different modes independently, so one light can show flags while another responds to the full telemetry stream.

### K10 Media Broadcaster — Stream Overlay Dashboard

A standalone Electron overlay that renders the full telemetry HUD as a transparent window on top of the sim. The dashboard shows gear, speed, and RPM with a color-coded tachometer; pedal input traces; fuel level with per-lap consumption and pit stop estimates; four-corner tyre temperatures with heat-map coloring; brake bias, traction control, and ABS settings; race position with gap times to the cars ahead and behind; iRating and Safety Rating; and the commentary engine's live prompts. The commentary panel slides in from the left when events fire, tinted to match the event's sentiment color.

The overlay runs at ~30fps, polling the plugin's HTTP API on port 8889. It supports native transparency on x64 and green-screen chroma keying on ARM. The same dashboard HTML also works as a SimHub dashboard template or directly in a browser.

Full setup and configuration: **[dashboard-overlay/README.md](dashboard-overlay/README.md)**

## Repository Structure

```
├── dashboard-overlay/                    Electron overlay app + dashboard HUD
│   ├── main.js                           Electron main process
│   ├── preload.js                        IPC bridge
│   ├── remote-server.js                  LAN HTTP server for remote access
│   ├── dashboard.html                    Main overlay UI (vanilla JS, no build step)
│   ├── modules/js/                       28 JavaScript modules (polling, commentary, drive mode, etc.)
│   ├── modules/styles/                   8 CSS modules
│   ├── data/                             Track + car research data for commentary
│   ├── streamdeck/                       Elgato Stream Deck profile + icons
│   └── images/                           Branding, car logos, flags
├── simhub-plugin/                        SimHub C# plugin + data
│   ├── plugin/K10MediaBroadcaster.Plugin/  C# source (NET Framework 4.8, WPF)
│   │   └── Engine/                       Commentary engine, trigger evaluator, sectors, iRating
│   ├── k10-media-broadcaster-data/       Commentary topics, fragments, sentiments (JSON)
│   ├── tests/                            C# unit tests + Python dataset validation
│   ├── tools/                            Telemetry replay, fragment generation
│   └── DashTemplates/                    SimHub dashboard templates
├── homebridge-plugin/                    Homebridge platform plugin (TypeScript)
│   ├── src/__tests__/                    Jest test suite (133 tests)
│   └── docs/                             Homebridge-specific documentation
├── src/agents/                           MCP servers (Model Context Protocol)
│   ├── simhub-telemetry/                 Telemetry data reader
│   ├── k10-plugin/                       SimHub plugin source inspector
│   ├── k10-broadcaster/                  Dashboard component inspector
│   └── claude-mcp-config.json            MCP server configuration
├── installer/                            Inno Setup combined Windows installer
│   └── k10-media-broadcaster.iss         Installer script (plugin + overlay)
├── scripts/                              Installation + launch scripts
│   ├── mac/                              macOS install, launch, rebuild
│   └── windows/                          Windows install, start, export, build-installer
└── .github/workflows/                    CI pipelines + release workflow
```

## Install

### Windows Installer (Recommended)

Download **K10-Media-Broadcaster-Setup.exe** from the [latest release](https://github.com/alternatekev/media-coach-simhub-plugin/releases/latest). The installer bundles both the SimHub plugin and the overlay application. You can choose to install either or both during setup. The installer auto-detects your SimHub installation and handles all file placement.

The plugin includes a built-in **Check for updates** button in its SimHub settings panel. When an update is available, it downloads the latest installer and launches it — SimHub will restart automatically.

### Manual Install (SimHub Plugin Only)

Prerequisites: [SimHub](https://www.simhubdash.com/) installed on Windows.

**iRacing users:** Install the **iRacing Extra Properties** plugin by RomainRob to enable iRating, Safety Rating, and licence class display on the dashboard overlay. Without it, these fields will show as empty — all other telemetry works without it. [Download iRacing Extra Properties](https://drive.google.com/drive/folders/1AiIWHviD4j-_D-zgRrjJU1AFhJ_xmass) — copy `RSC.iRacingExtraProperties.dll` into your SimHub installation folder (e.g. `C:\Program Files (x86)\SimHub`) while SimHub is closed. On next launch, SimHub will detect the new plugin — make sure it's enabled (green tab) and press OK.

**Double-click `install.bat`** (in `scripts/windows/`). The installer finds your SimHub installation, copies the plugin DLL, dataset files, and dashboard template to the correct locations. It checks whether SimHub is running and warns you to close it first if so.

After installation:

1. Launch SimHub
2. Enable "K10 Media Broadcaster" in the plugin list
3. Open the "k10 media broadcaster" dashboard template
4. Configure display timing, category filters, and event-only mode in the plugin settings panel

The plugin exposes all its data as SimHub properties (prefixed `K10MediaBroadcaster.Plugin.*`), so you can build your own dashboard layout or integrate the properties into an existing one.

To build from source instead: **[simhub-plugin/docs/DEVELOPMENT.md](simhub-plugin/docs/DEVELOPMENT.md)**

### Homebridge HomeKit Light Plugin

Prerequisites: [Homebridge](https://homebridge.io/) (v1.6+), Node.js 18+, SimHub web server enabled, at least one color-capable smart light.

**1. Install and configure the plugin:**

```bash
cd homebridge-plugin
npm install && npm run build && npm link
```

Add the `K10MediaBroadcasterLights` platform to your Homebridge `config.json`:

```json
{
  "platform": "K10MediaBroadcasterLights",
  "name": "K10 Media Broadcaster Lights",
  "simhubUrl": "http://localhost:8888",
  "mode": "all_colors",
  "enableBlink": true,
  "lights": [{ "name": "Sim Rig Light", "uniqueId": "k10-media-broadcaster-light-1" }]
}
```

**2. Connect the virtual light to your physical lights.** The plugin creates a virtual light in HomeKit that reflects telemetry — it doesn't control physical bulbs directly. You connect them using one of two approaches depending on how your lights are set up:

**If your lights are managed by Homebridge** (homebridge-hue, homebridge-shelly, etc.) — use [homebridge-plugin-automation](https://github.com/grrowl/homebridge-plugin-automation) (free). Install it, enable Homebridge insecure mode (`-I`), and create a script that mirrors the virtual light's HSB values to your real lights. This runs entirely server-side with the lowest latency. See the [full setup guide](homebridge-plugin/docs/HOMEKIT.md) for the complete script.

**If your lights are paired directly to HomeKit** (Hue Bridge → HomeKit, Nanoleaf → HomeKit, etc.) — use a HomeKit automation app. [Eve](https://www.evehome.com/en/eve-app) (free) handles basic triggers; [Controller for HomeKit](https://controllerforhomekit.com/) or [Home+](https://hochgatterer.me/home+/) (paid) support full HSB value-passthrough for exact color mirroring.

**3. Three light modes are available:**

| Mode          | What It Shows                                                    |
| ------------- | ---------------------------------------------------------------- |
| `flags_only`  | iRacing flags as colored lights (green, yellow, red, blue, etc.) |
| `events_only` | Proximity warnings and track events as color shifts              |
| `all_colors`  | Flags + severity + proximity combined (recommended)              |

Each light can override the global mode independently — run one light for flags and another for full telemetry. Blinking effects (flag pulses, proximity warnings) are configurable per-light.

Full setup walkthrough with multi-light configuration, automation scripts, and troubleshooting: **[homebridge-plugin/docs/HOMEKIT.md](homebridge-plugin/docs/HOMEKIT.md)**

## Documentation

| Document                                                                                       | Covers                                                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **SimHub Plugin**                                                                              |                                                                                                |
| [simhub-plugin/docs/SIMHUB_PLUGIN.md](simhub-plugin/docs/SIMHUB_PLUGIN.md)                     | Plugin architecture, cross-game support, settings, dashboard properties                        |
| [simhub-plugin/docs/COMMENTARY_ENGINE.md](simhub-plugin/docs/COMMENTARY_ENGINE.md)             | Trigger evaluation pipeline, severity interruption, fragment assembly, color system, cooldowns |
| **Homebridge Plugin**                                                                          |                                                                                                |
| [homebridge-plugin/docs/HOMEBRIDGE_PLUGIN.md](homebridge-plugin/docs/HOMEBRIDGE_PLUGIN.md)     | Platform architecture, color mapping, polling loop, per-light overrides                        |
| [homebridge-plugin/docs/HOMEKIT.md](homebridge-plugin/docs/HOMEKIT.md)                         | Apple HomeKit setup instructions, light modes, multi-light configuration, troubleshooting      |
| **Dashboard Overlay**                                                                          |                                                                                                |
| [dashboard-overlay/README.md](dashboard-overlay/README.md)                                     | Electron overlay setup, panel reference, architecture, drive mode, Stream Deck, OBS integration |
| **Shared**                                                                                     |                                                                                                |
| [simhub-plugin/docs/DATASETS.md](simhub-plugin/docs/DATASETS.md)                               | Topic schema, trigger conditions, fragment format, sentiment reference, how to add new topics  |
| [simhub-plugin/docs/TESTING.md](simhub-plugin/docs/TESTING.md)                                 | Test suites, CI integration                                                                   |
| [simhub-plugin/docs/DEVELOPMENT.md](simhub-plugin/docs/DEVELOPMENT.md)                         | Building from source, project setup, contributor workflow                                      |

## Testing

Three test suites run without SimHub, iRacing, or any external service:

```bash
# C# unit tests (200+ tests, NUnit)
cd simhub-plugin/tests/K10MediaBroadcaster.Tests && dotnet test

# Python dataset validation (28 tests)
python3 simhub-plugin/tests/validate_datasets.py

# Homebridge Jest tests (133 tests)
cd homebridge-plugin && npm test
```

The C# test project uses standalone reimplementations of the plugin's engine logic (no SimHub dependencies), so it runs on any platform with the .NET 6.0 SDK. The Python tools test the actual JSON dataset files and reproduce the full trigger evaluation pipeline for offline verification.

Full testing documentation: **[simhub-plugin/docs/TESTING.md](simhub-plugin/docs/TESTING.md)**

## Data Sources and Attribution

The commentary voice, phrase patterns, and fragment vocabulary are informed by the following sources. All transcripts were obtained through publicly available YouTube auto-captions or published APIs.

### Sim Racing YouTube Creators

| Channel                                                            | Style                                 | License                                  |
| ------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------- |
| [Jimmy Broadbent](https://www.youtube.com/@JimmyBroadbent)         | High-energy, humorous race commentary | YouTube Standard License (auto-captions) |
| [Matt Malone / MG Charoudin](https://www.youtube.com/@MGCharoudin) | Nürburgring-focused, technical        | YouTube Standard License                 |
| [Jaaames](https://www.youtube.com/@jaaames)                        | Competitive iRacing, analytical       | YouTube Standard License                 |
| [Traxion.GG](https://www.youtube.com/@Traxion)                     | Sim racing news and reviews           | YouTube Standard License                 |
| [JustHun Gaming](https://www.youtube.com/@JustHunGaming)           | ACC competitive, setup-focused        | YouTube Standard License                 |
| [Project Sim Racing](https://www.youtube.com/@ProjectSimRacing)    | Community broadcasts                  | YouTube Standard License                 |
| [Just Sim Racing](https://www.youtube.com/@JustSimRacing)          | Multi-sim, wheel-to-wheel focus       | YouTube Standard License                 |
| [Redd500 Gaming](https://www.youtube.com/@Redd500)                 | iRacing oval/road, narrative style    | YouTube Standard License                 |

### Professional Broadcast Commentary

| Source                                                                      | Style                                         | License                  |
| --------------------------------------------------------------------------- | --------------------------------------------- | ------------------------ |
| [Global SimRacing Channel](https://www.youtube.com/@GlobalSimRacingChannel) | Professional sim racing broadcasts since 2013 | YouTube Standard License |
| [RaceSpot TV](https://www.youtube.com/@RaceSpotTV)                          | eNASCAR official broadcast partner            | YouTube Standard License |
| [Apex Racing TV](https://www.youtube.com/@ApexRacingTV)                     | iRacing league broadcasts                     | YouTube Standard License |

### Coaching and Instructional

| Source                                                                                  | Style                                           | License                  |
| --------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------ |
| [Driver61](https://www.youtube.com/@Driver61)                                           | Professional racing coach, technique breakdowns | YouTube Standard License |
| [Suellio Almeida / Virtual Racing School](https://www.youtube.com/@VirtualRacingSchool) | Data-driven coaching, telemetry analysis        | YouTube Standard License |

### Structured Phrase Databases

| Source                                                    | Usage                                                      | License                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Crew Chief V4](https://gitlab.com/mr_belern/CrewChiefV4) | Spotter phrase patterns and audio composition architecture | [GPL-3.0](https://gitlab.com/mr_belern/CrewChiefV4/-/blob/master/LICENSE) |

The composable fragment system (opener + body + closer) is directly inspired by Crew Chief V4's audio clip composition architecture, where pre-recorded audio fragments are assembled at runtime from folder hierarchies. The text fragment approach is an adaptation of that concept for written commentary.

### User Content

| Source                                    | Usage                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| [alternate.org](http://www.alternate.org) | Voice matching reference for Kevin's personal commentary style |

### AI-Assisted Content

Commentary fragments in `simhub-plugin/k10-media-broadcaster-data/commentary_fragments.json` were generated using [Claude](https://claude.ai) (Anthropic's `claude-haiku-4-5` model) with the commentary topics, sentiment vocabulary, and channel style profiles as input. The generation is a one-time offline process — no AI API calls occur at runtime in the current version.

Plugin codebase, test suites, dataset structures, documentation, and Homebridge companion plugin built with [Claude Code](https://claude.ai/claude-code) (Anthropic's `claude-opus-4-6`).

## Roadmap

### Version 1.5 (current)

Composable sentence fragments assembled at runtime from pre-generated pools. 33 topics with refined thresholds, 240+ unique prompt combinations per topic, severity-based interruption, category+alpha color system, Homebridge integration with per-light mode overrides.

### Version 2.0 (planned)

Live AI commentary via the Anthropic Messages API (`claude-haiku-4-5`). Instead of selecting from pre-generated fragments, the engine calls Haiku at event fire time (~200-400ms latency) with a context-aware prompt built from the current telemetry snapshot, fired topic, and channel style profile. Fire-and-forget with callback — the event exposition text shows immediately as a loading placeholder, then the generated line replaces it when the API responds. Falls back to the fragment system if the API key is empty, the network is down, or the response exceeds 1.5 seconds.

## License

MIT

## Author

Kevin Conboy — [alternate.org](http://www.alternate.org)

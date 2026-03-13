<p align="center">
  <img src="dashboard-prototype/logomark.png" alt="K10 Media Coach" width="200">
</p>

# K10 Media Coach

Two plugins that work together: a **SimHub plugin** that generates real-time commentary prompts from sim racing telemetry, and a **Homebridge plugin** that drives Apple HomeKit smart lights from the same data. The SimHub plugin watches what happens on track — spins, overtakes, tyre wear, flag changes, close battles — and surfaces contextual commentary on a dashboard overlay. The Homebridge plugin translates that telemetry into light colors, so your room reacts to what's happening in the race.

Built for iRacing with cross-game fallback support via SimHub's telemetry abstraction.

## What It Does

### SimHub Commentary Plugin

The plugin evaluates 33 telemetry-driven trigger conditions at ~100ms intervals during a sim session. When a condition fires (spin detected, position gained, tyres overheating, yellow flag), it assembles a commentary prompt from composable sentence fragments and displays it on a SimHub dashboard overlay. Severity-based interruption ensures catastrophic events (wall contact, black flag) override lower-priority observations. A cooldown system prevents prompt spam.

The prompts are written in first person, present tense, technically grounded — matching the voice of a working sim racer talking through what's happening on track.

### Homebridge HomeKit Light Plugin

The companion plugin reads the same telemetry properties via SimHub's HTTP API and translates them into HomeKit light colors: flags as colored lights, severity as brightness, proximity as red/orange warning indicators. Multiple lights can run different modes independently, so one light can show flags while another responds to the full telemetry stream.

## Repository Structure

```
├── simhub-plugin/                        SimHub plugin and data
│   ├── plugin/K10MediaCoach.Plugin/      C# plugin (NET Framework 4.8, WPF)
│   │   ├── Engine/                       Commentary engine, trigger evaluator, fragments
│   │   ├── Models/                       Data models (topics, sentiments)
│   │   └── Properties/                   Assembly metadata
│   ├── dataset/                          Shared commentary data files (JSON)
│   │   ├── commentary_topics.json        33 topics with triggers, thresholds, prompts
│   │   ├── commentary_fragments.json     Composable sentence fragments (240+ combos/topic)
│   │   ├── sentiments.json               Sentiment vocabulary and colors
│   │   ├── channel_notes.json            Voice-matching style profiles
│   │   └── commentary_sources.json       Alternative transcript source index
│   ├── tests/
│   │   ├── K10MediaCoach.Tests/          C# unit tests (NUnit, 200+ tests)
│   │   ├── validate_datasets.py          Python dataset validation (28 tests)
│   │   └── recordings/                   Synthetic telemetry transcripts
│   ├── tools/
│   │   ├── replay_telemetry.py           Offline telemetry replay and scenario generation
│   │   └── generate_fragments.py         Haiku-powered fragment generation script
│   ├── DashTemplates/                    SimHub dashboard templates
│   └── docs/                             In-depth documentation
├── homebridge-plugin/                    Homebridge platform plugin (TypeScript)
│   ├── src/__tests__/                    Jest test suite (133 tests)
│   └── docs/                             Homebridge-specific documentation
├── install.bat                           One-click Windows installer
├── export.bat                            Export built files from SimHub back to repo
└── .github/workflows/                    CI pipelines
```

## Install

### SimHub Plugin

Prerequisites: [SimHub](https://www.simhubdash.com/) installed on Windows.

**Double-click `install.bat`** (in the repository root). The installer finds your SimHub installation, copies the plugin DLL, dataset files, and dashboard template to the correct locations. It checks whether SimHub is running and warns you to close it first if so.

After installation:

1. Launch SimHub
2. Enable "K10 Media Coach" in the plugin list
3. Open the "k10 media coach" dashboard template
4. Configure display timing, category filters, and event-only mode in the plugin settings panel

The plugin exposes all its data as SimHub properties (prefixed `K10MediaCoach.Plugin.*`), so you can build your own dashboard layout or integrate the properties into an existing one.

To build from source instead: **[simhub-plugin/docs/DEVELOPMENT.md](simhub-plugin/docs/DEVELOPMENT.md)**

### Homebridge HomeKit Light Plugin

Prerequisites: [Homebridge](https://homebridge.io/) (v1.6+), Node.js 18+, SimHub web server enabled, at least one color-capable smart light.

**1. Install and configure the plugin:**

```bash
cd homebridge-plugin
npm install && npm run build && npm link
```

Add the `K10MediaCoachLights` platform to your Homebridge `config.json`:

```json
{
  "platform": "K10MediaCoachLights",
  "name": "K10 Media Coach Lights",
  "simhubUrl": "http://localhost:8888",
  "mode": "all_colors",
  "enableBlink": true,
  "lights": [
    { "name": "Sim Rig Light", "uniqueId": "k10-media-coach-light-1" }
  ]
}
```

**2. Connect the virtual light to your physical lights.** The plugin creates a virtual light in HomeKit that reflects telemetry — it doesn't control physical bulbs directly. You connect them using one of two approaches depending on how your lights are set up:

**If your lights are managed by Homebridge** (homebridge-hue, homebridge-shelly, etc.) — use [homebridge-plugin-automation](https://github.com/grrowl/homebridge-plugin-automation) (free). Install it, enable Homebridge insecure mode (`-I`), and create a script that mirrors the virtual light's HSB values to your real lights. This runs entirely server-side with the lowest latency. See the [full setup guide](homebridge-plugin/docs/HOMEKIT.md) for the complete script.

**If your lights are paired directly to HomeKit** (Hue Bridge → HomeKit, Nanoleaf → HomeKit, etc.) — use a HomeKit automation app. [Eve](https://www.evehome.com/en/eve-app) (free) handles basic triggers; [Controller for HomeKit](https://controllerforhomekit.com/) or [Home+](https://hochgatterer.me/home+/) (paid) support full HSB value-passthrough for exact color mirroring.

**3. Three light modes are available:**

| Mode | What It Shows |
|------|---------------|
| `flags_only` | iRacing flags as colored lights (green, yellow, red, blue, etc.) |
| `events_only` | Proximity warnings and track events as color shifts |
| `all_colors` | Flags + severity + proximity combined (recommended) |

Each light can override the global mode independently — run one light for flags and another for full telemetry. Blinking effects (flag pulses, proximity warnings) are configurable per-light.

Full setup walkthrough with multi-light configuration, automation scripts, and troubleshooting: **[homebridge-plugin/docs/HOMEKIT.md](homebridge-plugin/docs/HOMEKIT.md)**

## Documentation

| Document | Covers |
|----------|--------|
| **SimHub Plugin** | |
| [simhub-plugin/docs/SIMHUB_PLUGIN.md](simhub-plugin/docs/SIMHUB_PLUGIN.md) | Plugin architecture, cross-game support, settings, dashboard properties |
| [simhub-plugin/docs/COMMENTARY_ENGINE.md](simhub-plugin/docs/COMMENTARY_ENGINE.md) | Trigger evaluation pipeline, severity interruption, fragment assembly, color system, cooldowns |
| **Homebridge Plugin** | |
| [homebridge-plugin/docs/HOMEBRIDGE_PLUGIN.md](homebridge-plugin/docs/HOMEBRIDGE_PLUGIN.md) | Platform architecture, color mapping, polling loop, per-light overrides |
| [homebridge-plugin/docs/HOMEKIT.md](homebridge-plugin/docs/HOMEKIT.md) | Apple HomeKit setup instructions, light modes, multi-light configuration, troubleshooting |
| **Shared** | |
| [simhub-plugin/docs/DATASETS.md](simhub-plugin/docs/DATASETS.md) | Topic schema, trigger conditions, fragment format, sentiment reference, how to add new topics |
| [simhub-plugin/docs/TESTING.md](simhub-plugin/docs/TESTING.md) | All four test suites, synthetic scenarios, CI integration, telemetry recording/replay |
| [simhub-plugin/docs/DEVELOPMENT.md](simhub-plugin/docs/DEVELOPMENT.md) | Building from source, project setup, contributor workflow |

## Testing

Four test suites run without SimHub, iRacing, or any external service:

```bash
# C# unit tests (200+ tests, NUnit)
cd simhub-plugin/tests/K10MediaCoach.Tests && dotnet test

# Python dataset validation (28 tests)
python3 simhub-plugin/tests/validate_datasets.py

# Telemetry replay with synthetic scenarios
python3 simhub-plugin/tools/replay_telemetry.py generate full_race

# Homebridge Jest tests (133 tests)
cd homebridge-plugin && npm test
```

The C# test project uses standalone reimplementations of the plugin's engine logic (no SimHub dependencies), so it runs on any platform with the .NET 6.0 SDK. The Python tools test the actual JSON dataset files and reproduce the full trigger evaluation pipeline for offline verification.

Full testing documentation: **[simhub-plugin/docs/TESTING.md](simhub-plugin/docs/TESTING.md)**

## Data Sources and Attribution

The commentary voice, phrase patterns, and fragment vocabulary are informed by the following sources. All transcripts were obtained through publicly available YouTube auto-captions or published APIs.

### Sim Racing YouTube Creators

| Channel | Style | License |
|---------|-------|---------|
| [Jimmy Broadbent](https://www.youtube.com/@JimmyBroadbent) | High-energy, humorous race commentary | YouTube Standard License (auto-captions) |
| [Matt Malone / MG Charoudin](https://www.youtube.com/@MGCharoudin) | Nürburgring-focused, technical | YouTube Standard License |
| [Jaaames](https://www.youtube.com/@jaaames) | Competitive iRacing, analytical | YouTube Standard License |
| [Traxion.GG](https://www.youtube.com/@Traxion) | Sim racing news and reviews | YouTube Standard License |
| [JustHun Gaming](https://www.youtube.com/@JustHunGaming) | ACC competitive, setup-focused | YouTube Standard License |
| [Project Sim Racing](https://www.youtube.com/@ProjectSimRacing) | Community broadcasts | YouTube Standard License |
| [Just Sim Racing](https://www.youtube.com/@JustSimRacing) | Multi-sim, wheel-to-wheel focus | YouTube Standard License |
| [Redd500 Gaming](https://www.youtube.com/@Redd500) | iRacing oval/road, narrative style | YouTube Standard License |

### Professional Broadcast Commentary

| Source | Style | License |
|--------|-------|---------|
| [Global SimRacing Channel](https://www.youtube.com/@GlobalSimRacingChannel) | Professional sim racing broadcasts since 2013 | YouTube Standard License |
| [RaceSpot TV](https://www.youtube.com/@RaceSpotTV) | eNASCAR official broadcast partner | YouTube Standard License |
| [Apex Racing TV](https://www.youtube.com/@ApexRacingTV) | iRacing league broadcasts | YouTube Standard License |

### Coaching and Instructional

| Source | Style | License |
|--------|-------|---------|
| [Driver61](https://www.youtube.com/@Driver61) | Professional racing coach, technique breakdowns | YouTube Standard License |
| [Suellio Almeida / Virtual Racing School](https://www.youtube.com/@VirtualRacingSchool) | Data-driven coaching, telemetry analysis | YouTube Standard License |

### Structured Phrase Databases

| Source | Usage | License |
|--------|-------|---------|
| [Crew Chief V4](https://gitlab.com/mr_belern/CrewChiefV4) | Spotter phrase patterns and audio composition architecture | [GPL-3.0](https://gitlab.com/mr_belern/CrewChiefV4/-/blob/master/LICENSE) |

The composable fragment system (opener + body + closer) is directly inspired by Crew Chief V4's audio clip composition architecture, where pre-recorded audio fragments are assembled at runtime from folder hierarchies. The text fragment approach is an adaptation of that concept for written commentary.

### User Content

| Source | Usage |
|--------|-------|
| [alternate.org](http://www.alternate.org) | Voice matching reference for Kevin's personal commentary style |

### AI-Assisted Content

Commentary fragments in `simhub-plugin/dataset/commentary_fragments.json` were generated using [Claude](https://claude.ai) (Anthropic's `claude-haiku-4-5` model) with the commentary topics, sentiment vocabulary, and channel style profiles as input. The generation is a one-time offline process — no AI API calls occur at runtime in the current version.

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

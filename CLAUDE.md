# Project Guidelines

## Agent Work — Always Use Worktrees

All agent-spawned work MUST use `isolation: "worktree"`. Exceptions: read-only exploration, single non-code file writes.

## Project Overview

K10 Motorsports — broadcast-grade sim racing platform.

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `racecor-overlay/` | Electron, vanilla JS, WebGL2, Canvas 2D | Overlay HUD (30fps polling) |
| `racecor-plugin/simhub-plugin/` | C# .NET Framework 4.8, NUnit (.NET 6) | SimHub plugin (telemetry, commentary, strategy) |
| `racecor-plugin/homebridge-plugin/` | TypeScript, Jest | HomeKit smart light integration |
| `web/` | Next.js 16, React 19, Tailwind 4, Drizzle ORM | Marketing site + Pro Drive admin dashboard |
| `web-api/` | Node.js ESM | Mock telemetry server (dev) |
| `racecor-io-components/` | Storybook, React 19 | Component library |
| `src/agents/` | Node.js, MCP SDK | 3 MCP servers: k10-broadcaster, k10-plugin, simhub-telemetry |
| `installer/` | Inno Setup | Windows installer (.iss) |
| `scripts/` | Bash, Node, Python | Build, install, launch scripts |
| `docs/` | Markdown, HTML | Architecture and design docs |

## Data Flow

iRacing SDK → C# TelemetrySnapshot → cross-game normalization → 33+ commentary triggers → strategy modules (tire/fuel/pit/opponent/position) → HTTP API on port 8889 (`http://localhost:8889/racecor-io-pro-drive/`) → overlay polls at ~30fps → WebGL rendering. Homebridge subscribes for light color mapping.

## Code Style

- Overlay: vanilla JS (no framework) — intentional for 30fps performance
- CSS: plain `.css` files loaded via `<link>` (NOT CSS modules), custom properties for theming
- WebGL shaders: inlined in JS
- Plugin HTTP server: port 8889, serves 100+ JSON properties
- Web: Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` before writing code

## Key File Paths

| What | Path |
|------|------|
| Overlay entry | `racecor-overlay/dashboard.html` + `main.js` |
| Overlay JS modules | `racecor-overlay/modules/js/*.js` |
| Overlay CSS | `racecor-overlay/modules/styles/*.css` |
| Plugin entry | `racecor-plugin/simhub-plugin/plugin/RaceCorProDrive.Plugin/Plugin.cs` |
| Plugin .csproj | `racecor-plugin/simhub-plugin/plugin/RaceCorProDrive.Plugin/RaceCorProDrive.Plugin.csproj` |
| Plugin tests | `racecor-plugin/simhub-plugin/tests/RaceCorProDrive.Tests/` |
| DB schema | `web/src/db/schema.ts` |
| Token build | `web/src/lib/tokens/build.ts` |
| MCP config | `src/agents/claude-mcp-config.json` |
| CI workflows | `.github/workflows/{dashboard,homebridge,simhub}-ci.yml` + `release.yml` |

## Quality Gates

- 200+ C# NUnit tests (net6.0), 62 Python dataset tests, 133 Homebridge Jest tests, Playwright overlay tests
- CI: dashboard-ci, homebridge-ci, simhub-ci, release (on `v*` tags)
- `plugin-ci.yml` is disabled (duplicate of simhub-ci)

## Design System

- 60+ CSS custom properties (tokens), Style Dictionary pipeline, three visual modes (Standard/Minimal/Minimal+)
- Theme sets: 12 F1 teams (dark+light per team), stored in DB `theme_sets`/`theme_overrides` tables
- Token editor in admin UI, CSS builds via `web/src/lib/tokens/build.ts`

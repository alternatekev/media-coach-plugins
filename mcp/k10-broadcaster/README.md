# K10 Media Broadcaster MCP Server

A Model Context Protocol (MCP) server providing structured access to the K10 Media Broadcaster React/TypeScript overlay source code. This MCP enables Claude to understand the overlay's component architecture, types, hooks, styling, and build configuration without parsing raw HTML or manually reading files.

## Location

```
mcp/k10-broadcaster/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
└── dist/
    ├── index.js
    └── index.d.ts
```

## Features

The MCP provides 12 specialized tools for exploring the K10 Broadcaster React codebase:

### Component Management
- **`list_components`** - Lists all React components with categories (HUD, panels, overlays, settings, layout)
- **`get_component`** - Reads component source (TSX) and styling (CSS modules)
- **`get_component_tree`** - Extracts the full component hierarchy from Dashboard.tsx

### Type Definitions
- **`get_telemetry_types`** - Reads telemetry type definitions (TelemetryProps, ParsedTelemetry, ConnectionStatus, PollStats)
- **`get_settings_types`** - Reads overlay settings definitions (OverlaySettings, DEFAULT_SETTINGS, validators)

### Hooks & Libraries
- **`get_hook`** - Reads custom React hooks (useTelemetry, useSettings)
- **`get_lib`** - Reads utility libraries (formatters, manufacturers, telemetry-client)

### Styling & Design
- **`get_design_tokens`** - Reads CSS custom properties (design system variables)

### Testing
- **`list_tests`** - Lists all test files
- **`get_test`** - Reads specific test files

### Build Configuration
- **`get_build_config`** - Reads vite.config.ts, tsconfig.json, and package.json

### Code Search
- **`search_source`** - Searches across source files for regex patterns with context

## Source Structure

The MCP reads from the K10 Broadcaster React source:

```
k10-media-broadcaster/src/src/
├── components/
│   ├── hud/               # HUD overlay components
│   │   ├── Tachometer.tsx
│   │   ├── FuelPanel.tsx
│   │   ├── TyresPanel.tsx
│   │   ├── PedalsPanel.tsx
│   │   ├── ControlsPanel.tsx
│   │   ├── PositionPanel.tsx
│   │   ├── GapsPanel.tsx
│   │   ├── LogoPanel.tsx
│   │   ├── CommentaryPanel.tsx
│   │   └── *module.css files
│   ├── panels/            # Secondary panels
│   │   ├── LeaderboardPanel.tsx
│   │   ├── DatastreamPanel.tsx
│   │   ├── IncidentsPanel.tsx
│   │   └── SpotterPanel.tsx
│   ├── overlays/          # Full-screen overlays
│   │   ├── RaceControlBanner.tsx
│   │   ├── PitLimiterBanner.tsx
│   │   └── RaceEndScreen.tsx
│   ├── settings/          # Settings UI
│   │   └── SettingsPanel.tsx
│   └── layout/            # Main layouts
│       └── Dashboard.tsx
├── hooks/
│   ├── useTelemetry.tsx   # Telemetry polling hook
│   └── useSettings.tsx    # Settings persistence hook
├── lib/
│   ├── formatters.ts      # Value formatting utilities
│   ├── manufacturers.ts   # Car/team logos database
│   └── telemetry-client.ts # SimHub API client
├── types/
│   ├── telemetry.ts       # Telemetry data types
│   ├── settings.ts        # Settings configuration types
│   └── leaderboard.ts     # Leaderboard data types
├── styles/
│   ├── tokens.css         # CSS custom properties
│   ├── globals.css        # Global styles
│   ├── dashboard.module.css
│   └── components.module.css
├── test/
│   ├── components/        # Component tests
│   ├── formatters.test.ts
│   ├── manufacturers.test.ts
│   ├── telemetry-client.test.ts
│   └── helpers.tsx
├── App.tsx
├── main.tsx
└── demo-preview.tsx
```

## Tool Reference

### list_components

Lists all React components with file paths and CSS module status.

**Parameters:**
- `category` (optional): Filter by "hud", "panels", "overlays", "settings", "layout", or "all" (default)

**Returns:** Component list with names, categories, file paths, and CSS availability

**Example:**
```
Get HUD components only:
category: "hud"
```

### get_component

Reads a component's TSX source and CSS module (if it exists).

**Parameters:**
- `name` (required): Component name without extension (e.g., "Tachometer", "FuelPanel")

**Returns:** Combined TSX and CSS module contents

**Example:**
```
name: "Tachometer"
→ Returns Tachometer.tsx and Tachometer.module.css
```

### get_telemetry_types

Returns all telemetry type definitions from src/types/telemetry.ts.

**Parameters:** None

**Returns:** Full TypeScript type definitions including:
- `TelemetryProps` - Raw telemetry snapshot interface
- `ParsedTelemetry` - Normalized telemetry with friendly names
- `ConnectionStatus` - Connection state type
- `PollStats` - Polling statistics interface

### get_settings_types

Returns all settings configuration types from src/types/settings.ts.

**Parameters:** None

**Returns:** Full TypeScript type definitions including:
- `OverlaySettings` - Complete settings interface
- `LayoutPosition`, `SecondaryLayout`, `LayoutFlow` - Type unions
- `DEFAULT_SETTINGS` - Default settings constant
- Validator functions

### get_hook

Reads a custom React hook from src/hooks.

**Parameters:**
- `name` (required): "useTelemetry" or "useSettings"

**Returns:** Full hook source code including:
- State management
- Effects and side effects
- Return value interfaces
- Usage examples

### get_lib

Reads a utility library from src/lib.

**Parameters:**
- `name` (required): "formatters", "manufacturers", or "telemetry-client"

**Returns:** Library source code including:
- Function definitions
- Type exports
- Utility implementations

### get_design_tokens

Returns CSS custom properties from src/styles/tokens.css.

**Parameters:** None

**Returns:** Complete design system:
- Color variables
- Typography variables
- Spacing and sizing
- Layout variables

### get_component_tree

Parses Dashboard.tsx to extract the full component hierarchy.

**Parameters:** None

**Returns:**
- Component imports
- JSX structure
- Conditional rendering logic
- Component composition order

### list_tests

Lists all test files in the project.

**Parameters:** None

**Returns:** Test file names and paths

### get_test

Reads a specific test file.

**Parameters:**
- `name` (required): Test name without extension (e.g., "formatters", "components/Tachometer")

**Returns:** Full test source code including:
- Test suites
- Test cases
- Assertions
- Mock setup

### get_build_config

Returns build configuration files.

**Parameters:** None

**Returns:** Combined content from:
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### search_source

Searches across all source files for a regex pattern.

**Parameters:**
- `pattern` (required): Regex pattern to search for
- `fileType` (optional): "tsx", "ts", "css", or "all" (default)

**Returns:**
- File paths
- Line numbers
- Matching lines
- Context (surrounding lines)
- Limited to first 50 results

**Example:**
```
pattern: "useState"
fileType: "tsx"
→ Returns all useState imports and calls
```

## Installation & Setup

### Build the MCP

```bash
cd /sessions/gifted-keen-pasteur/mnt/media-coach-simhub-plugin/mcp/k10-broadcaster
npm install
npm run build
```

### Start the Server

```bash
npm start
```

The server will start on stdio and begin accepting MCP calls.

### Environment Variables

- `K10_BROADCASTER_ROOT` - Path to k10-media-broadcaster src/src directory
  - Default: `/sessions/gifted-keen-pasteur/mnt/media-coach-simhub-plugin/k10-media-broadcaster/src/src`

## Component Architecture

The overlay follows a clear component hierarchy:

```
Dashboard (Main Layout)
├── Main HUD Area (grid-based)
│   ├── Fuel Column
│   │   ├── FuelPanel
│   │   └── TyresPanel
│   ├── Controls Column
│   │   ├── ControlsPanel
│   │   └── PedalsPanel
│   ├── Maps Column (placeholder)
│   ├── Position Column
│   │   ├── PositionPanel
│   │   └── GapsPanel
│   ├── Tachometer Column
│   └── Logo Column (K10 + Car)
├── Timer Row (placeholder)
├── Commentary Column (right side)
├── Secondary Panels (opposite side)
│   ├── LeaderboardPanel
│   ├── DatastreamPanel
│   ├── IncidentsPanel
│   └── SpotterPanel
├── Full-width Overlays
│   ├── RaceControlBanner
│   ├── PitLimiterBanner
│   └── RaceEndScreen
└── SettingsPanel (overlay)
```

## Telemetry Flow

```
SimHub Plugin API
    ↓
useTelemetry Hook
    ↓
ParsedTelemetry (normalized)
    ↓
Dashboard & Components
    ↓
Display Data
```

## Settings Flow

```
OverlaySettings (types)
    ↓
useSettings Hook (localStorage/IPC)
    ↓
DEFAULT_SETTINGS (defaults)
    ↓
SettingsPanel (UI)
    ↓
Dashboard Layout
```

## Usage Example

```typescript
// List all HUD components
tools.call("list_components", { category: "hud" })

// Get Tachometer component code
tools.call("get_component", { name: "Tachometer" })

// Understand telemetry types
tools.call("get_telemetry_types", {})

// Find all useState calls
tools.call("search_source", {
  pattern: "useState",
  fileType: "tsx"
})

// Get component tree
tools.call("get_component_tree", {})

// Read the telemetry hook
tools.call("get_hook", { name: "useTelemetry" })
```

## Benefits

Instead of asking Claude to read raw dashboard.html or manually parsing files:

1. **Structured Access**: Get exactly what you need via specialized tools
2. **Type Safety**: Understand types without parsing TypeScript
3. **Code Navigation**: Easily explore component relationships
4. **Search Capability**: Find patterns across the entire codebase
5. **No HTML Parsing**: Work with source code, not compiled output
6. **Categorized Components**: Find components by their functional area
7. **Complete Context**: Access styles, tests, and configuration together

## Building on This MCP

The MCP can be extended with additional tools:

- Component dependency graph
- Hook usage analysis
- Test coverage reports
- Performance metrics
- Type relationship diagrams
- Component prop documentation
- Import/export analysis

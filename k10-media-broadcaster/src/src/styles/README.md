# K10 Media Broadcaster — CSS Design System

This directory contains the modular CSS design system extracted from `dashboard.html`, organized into four focused files:

## Files

### 1. **tokens.css** (88 lines)
All CSS custom properties and design tokens:
- Spacing: `--gap`, `--pad`, `--corner-r`, `--row-h`, `--dash-h`
- Colors: Semantic colors (--red, --green, --blue, --amber, --orange, --cyan, --purple)
- Text layers: --text-primary, --text-secondary, --text-dim
- Typography: Font families, sizes, weights
- Animations: Transition timings (--t-fast, --t-med, --t-slow)
- Dynamic variables: --sentiment-h/s/l/alpha, --commentary-h

### 2. **globals.css** (285 lines)
Global reset and base styles:
- Universal box-sizing reset
- Body defaults: font, background, overflow, antialiasing
- Opaque mode (OBS green-screen): background color and filter overrides
- Settings/drag mode: UI hints and interaction controls
- **All 15 keyframe animations**:
  - Tachometer: `redline-pulse`, `tacho-redline-flash`
  - Fuel: `fuel-warn`
  - Value changes: `value-flash`, `ctrl-bar-flash`, `ds-val-flash`, `inc-flash`
  - Flags: `flag-glow-*` (yellow, red, blue, green, white, debris, checkered, black)
  - Commentary: `commentaryScroll`
  - Race control: `rc-glow`, `rc-glow-red`, `rc-flag-scroll`
  - Pit limiter: `pit-glow`
  - Start lights: `light-pulse-red`, `light-pulse-green`, `go-flash`
  - Flag waving: `flag-wave-majestic`
  - Connection: `conn-pulse`

### 3. **dashboard.module.css** (204 lines)
Main dashboard grid layout:
- Fixed positioning container with responsive grid
- Layout anchoring: `layout-tr`, `layout-tl`, `layout-br`, `layout-bl`, `layout-tc`, `layout-bc`
- Flow directions: `flow-rtl` (right-to-left) and `flow-ltr` (left-to-right)
- Vertical swap: `vswap` class for reversing component order
- Corner rounding for grid alignment
- Timer row positioning with edge offsets
- Background glow effect with sentiment colors

### 4. **components.module.css** (1037 lines)
Shared component styles covering all major UI elements:
- **Panel base**: `.panel` with background, border, padding, transitions
- **Typography**: `.panel-label`, `.label`, `.val` for values
- **Logo column**: Two stacked squares with car/branding logos
- **Tachometer**: Gear, RPM, speed display, RPM pulses, redline segments
- **Fuel & Tyres**: Fuel bar (healthy/caution/critical), tyre grid with temperature states
- **Controls & Pedals**: BB/TC/ABS control bars, layered pedal histograms
- **Maps**: Full track map and zoomed local map
- **Position/Rating/Gaps**: Position display, iRating bar, safety rating pie, gap-to-ahead/behind
- **Cycling system**: Active/inactive page states and indicator dots

## Import Order

```css
/* In components using these styles: */
@import 'tokens.css';        /* Must be first */
@import 'globals.css';       /* Depends on tokens.css */
@import 'dashboard.module.css';   /* Depends on tokens.css */
@import 'components.module.css';  /* Depends on tokens.css */
```

## Design Principles

1. **Color consistency**: All semantic colors (--red, --green, etc.) use consistent HSL values
2. **Spacing**: All gaps use CSS var(--gap) and var(--pad) for alignment
3. **Typography**: Font sizes use predefined scale (--fs-xl through --fs-xs)
4. **Animation**: All transitions use timing tokens (--t-fast, --t-med, --t-slow)
5. **Responsiveness**: Dashboard uses fixed positioning with layout modifiers
6. **Dark theme**: HSLA colors with transparency for layering effects
7. **Accessibility**: Text hierarchy through font-weight and color hierarchy

## Color Palette

- **Primary dark**: `--bg` (#1a1a14), `--bg-panel` (#0f0f0f)
- **Logo dark**: `--bg-logo` (#1f1f1f)
- **Text**: Primary (#fff), Secondary (#b0b0b0), Dim (#8d8d8d)
- **Status**: 
  - Green: #43a047 (throttle, gain, position up)
  - Red: #e53935 (brake, loss, position down)
  - Blue: #1e88e5 (clutch, info)
  - Amber: #ffb300 (warning, fuel caution)
  - Cyan: #00acc1 (player highlight)
  - Purple: hsl(280, 80%, 70%) (best lap)

## Usage Notes

- All padding/margin uses `--gap` (4px) and `--pad` (6px) for grid alignment
- Border radii: `--corner-r` (8px) for outer corners, `--corner-r-sm` (5px) for inner
- Numeric displays use `font-variant-numeric: tabular-nums` for mono-width alignment
- All transitions respect motion preferences via cubic-bezier easing
- WebGL canvases overlay with `.gl-overlay` class for advanced effects

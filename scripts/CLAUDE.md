# Build & Utility Scripts

Cross-project scripts for building, installing, launching, and maintaining the platform.

## Scripts

| Script | Language | Purpose |
|--------|----------|---------|
| `build-web-demo.mjs` | Node.js | Generates demo telemetry data for the web overlay widget. Runs automatically as a prebuild step for `web/` (`npm run dev` and `npm run build`). |
| `parse-shtl.js` | Node.js | Parses SimHub template language (SHTL) files. |
| `generate-screenshots.py` | Python | Generates screenshots for documentation and testing. |
| `stamp-version.sh` | Bash | Stamps version numbers across the monorepo (installer `.iss`, package.json files, etc.). |

## Platform Launchers (macOS)

| Script | Purpose |
|--------|---------|
| `mac/RaceCor.command` | Double-click launcher for the overlay |
| `mac/install.command` | Dependency installer |
| `mac/launch.sh` | Shell launch script |

## Windows Build Scripts

| Script | Purpose |
|--------|---------|
| `windows/build-installer.bat` | Builds the Inno Setup installer |
| `windows/export.bat` | Exports built files from SimHub back to repo |
| `windows/rebuild.bat` | Full rebuild of plugin + overlay |

## Relationship to Other Projects

- `build-web-demo.mjs` is called by `web/package.json` prebuild hooks
- `stamp-version.sh` updates version strings in `installer/racecor-prodrive.iss` and other files
- macOS launchers start the `racecor-overlay/` Electron app

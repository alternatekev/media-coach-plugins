# Windows Installer

Inno Setup script that packages both the SimHub plugin and the Electron overlay into a single Windows installer.

## Tech Stack

- Inno Setup (`.iss` script)
- Supports x64 and arm64 Windows

## Key File

`racecor-prodrive.iss` — the installer script. Paths are relative to the `installer/` directory.

## Prerequisites (Build Before Compiling)

1. `dotnet build` the SimHub plugin → produces `RaceCorProDrive.dll`
2. `npm run build:win` in `racecor-overlay/` → produces `dist/win-unpacked/` and `dist/win-arm64-unpacked/`

## Compiling

```bash
iscc installer/racecor-prodrive.iss
```

## Testing

Installer structure and simulated install/export are validated by Python tests in `racecor-plugin/simhub-plugin/tools/test_installer.py` (34 tests). These run in CI via `simhub-ci.yml`.

## Versioning

Current version defined in the `.iss` file (`#define MyAppVersion`). Also stamped by `scripts/stamp-version.sh`.

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# stamp-version.sh — single source of truth for project version
#
# Reads the latest git tag (e.g. v0.1.4 → 0.1.4) and stamps it
# into every file that carries a version string:
#   • dashboard-overlay/package.json
#   • installer/k10-motorsports.iss
#   • simhub-plugin/plugin/.../Properties/AssemblyInfo.cs
#
# Usage:  ./scripts/stamp-version.sh          (uses latest git tag)
#         ./scripts/stamp-version.sh 0.2.0    (explicit override)
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Resolve version: explicit arg → latest git tag → fail
if [[ ${1:-} ]]; then
  VER="${1#v}"
elif git describe --tags --abbrev=0 &>/dev/null; then
  VER="$(git describe --tags --abbrev=0 | sed 's/^v//')"
else
  echo "ERROR: No git tag found and no version argument provided." >&2
  exit 1
fi

# Pad to 4-part for AssemblyInfo (0.1.4 → 0.1.4.0)
IFS='.' read -ra PARTS <<< "$VER"
while [[ ${#PARTS[@]} -lt 4 ]]; do PARTS+=("0"); done
ASM_VER="${PARTS[0]}.${PARTS[1]}.${PARTS[2]}.${PARTS[3]}"

echo "Stamping version: $VER (assembly: $ASM_VER)"

stamp() {
  local file="$1" pattern="$2" replacement="$3"
  local content
  content=$(sed -E "s|$pattern|$replacement|" "$file")
  printf '%s\n' "$content" > "$file"
}

# 1. package.json
stamp "dashboard-overlay/package.json" \
  '"version": *"[^"]+"' "\"version\": \"$VER\""

# 2. Inno Setup .iss
stamp "installer/k10-motorsports.iss" \
  '#define MyAppVersion +"[^"]+"' "#define MyAppVersion   \"$VER\""

# 3. AssemblyInfo.cs
ASMFILE="simhub-plugin/plugin/K10Motorsports.Plugin/Properties/AssemblyInfo.cs"
content=$(sed -E \
  -e "s/AssemblyVersion\(\"[^\"]+\"\)/AssemblyVersion(\"$ASM_VER\")/" \
  -e "s/AssemblyFileVersion\(\"[^\"]+\"\)/AssemblyFileVersion(\"$ASM_VER\")/" \
  "$ASMFILE")
printf '%s\n' "$content" > "$ASMFILE"

echo "  package.json        -> $VER"
echo "  k10-motorsports.iss -> $VER"
echo "  AssemblyInfo.cs     -> $ASM_VER"

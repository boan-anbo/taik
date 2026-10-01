#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
taik sim feedback (project-specific)

Captures a reproducible “what’s happening” snapshot for iOS Simulator + Expo/Metro:
- Simulator screenshot
- Recent Simulator logs (log show)
- Current Expo/Metro port + manifest (if reachable)

Usage:
  scripts/taik/sim-feedback.sh [--out <dir>] [--minutes <n>]

Examples:
  scripts/taik/sim-feedback.sh
  scripts/taik/sim-feedback.sh --minutes 10
  scripts/taik/sim-feedback.sh --out /tmp/taik-debug
EOF
}

OUT_DIR=""
MINUTES="5"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --minutes)
      MINUTES="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${OUT_DIR}" ]]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  OUT_DIR="/tmp/taik-sim-feedback-${TS}"
fi

mkdir -p "${OUT_DIR}"

BOOTED_COUNT="$(xcrun simctl list devices booted 2>/dev/null | grep -c '(Booted)' || true)"
if [[ -z "${BOOTED_COUNT}" || "${BOOTED_COUNT}" == "0" ]]; then
  echo "No booted iOS Simulator found. Boot a simulator first." >&2
  exit 1
fi

echo "[1/4] Screenshot…"
xcrun simctl io booted screenshot "${OUT_DIR}/simulator.png" >/dev/null

echo "[2/4] Simulator logs (last ${MINUTES}m)…"
{
  echo "Captured at: $(date -u +\"%Y-%m-%dT%H:%M:%SZ\")"
  echo
  xcrun simctl spawn booted log show --style compact --last "${MINUTES}m" 2>/dev/null || true
} > "${OUT_DIR}/simulator.log.txt"

echo "[3/4] Expo/Metro status…"
{
  echo "Captured at: $(date -u +\"%Y-%m-%dT%H:%M:%SZ\")"
  echo
  echo "Booted devices:"
  xcrun simctl list devices booted 2>/dev/null || true
  echo
  echo "Listening ports:"
  lsof -nP -iTCP:8081 -sTCP:LISTEN 2>/dev/null || true
  lsof -nP -iTCP:8082 -sTCP:LISTEN 2>/dev/null || true
  echo
  echo "Expo processes:"
  if command -v rg >/dev/null 2>&1; then
    ps aux | rg -n "(expo start|@expo/cli|metro)" 2>/dev/null || true
  else
    ps aux | grep -E "expo start|@expo/cli|metro" || true
  fi
} > "${OUT_DIR}/expo-metro.txt"

echo "[4/4] Expo manifest (if reachable)…"
PORT=""
if lsof -nP -iTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  PORT="8081"
elif lsof -nP -iTCP:8082 -sTCP:LISTEN >/dev/null 2>&1; then
  PORT="8082"
fi

if [[ -n "${PORT}" ]]; then
  curl -fsS "http://127.0.0.1:${PORT}/" > "${OUT_DIR}/expo-manifest.json" 2>/dev/null || true
else
  echo "No Metro port detected on 8081/8082." > "${OUT_DIR}/expo-manifest.json"
fi

echo
echo "Saved snapshot to: ${OUT_DIR}"
echo "Files:"
ls -1 "${OUT_DIR}" | sed 's/^/  - /'

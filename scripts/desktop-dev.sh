#!/usr/bin/env bash
set -euo pipefail

# Stop any existing Tauri dev instances to avoid multiple windows.
pkill -f "tauri dev" >/dev/null 2>&1 || true

# Start Tauri dev for the desktop app (auto-reloads on changes).
npm -w taik-desktop run tauri:dev

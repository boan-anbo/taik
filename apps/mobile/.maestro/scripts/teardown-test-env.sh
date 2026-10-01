#!/bin/bash
#
# Taik E2E Test Environment Teardown
# Shuts down and optionally deletes the test simulator.
#
# Usage:
#   ./.maestro/scripts/teardown-test-env.sh [--delete]
#
# Options:
#   --delete    Permanently delete the test simulator
#

set -e

SIMULATOR_NAME="Taik-E2E-Test"
MAESTRO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Parse arguments
DELETE_MODE=false
if [[ "$1" == "--delete" ]]; then
    DELETE_MODE=true
fi

# Find test simulator
SIMULATOR_UDID=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep -oE '[A-F0-9-]{36}' | head -1)

if [[ -z "$SIMULATOR_UDID" ]]; then
    log_warn "Test simulator '$SIMULATOR_NAME' not found. Nothing to do."
    exit 0
fi

# Shutdown simulator
log_info "Shutting down simulator: $SIMULATOR_NAME ($SIMULATOR_UDID)"
xcrun simctl shutdown "$SIMULATOR_UDID" 2>/dev/null || true

if [[ "$DELETE_MODE" == true ]]; then
    log_info "Deleting simulator..."
    xcrun simctl delete "$SIMULATOR_UDID"
    rm -f "$MAESTRO_DIR/.test-simulator-udid"
    log_info "Simulator deleted ✓"
else
    log_info "Simulator shut down (use --delete to remove permanently)"
fi

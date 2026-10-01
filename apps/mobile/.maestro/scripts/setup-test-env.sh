#!/bin/bash
#
# Taik E2E Test Environment Setup
# Creates a dedicated simulator with all required apps and configurations.
#
# Usage:
#   ./.maestro/scripts/setup-test-env.sh [--reset]
#
# Options:
#   --reset    Delete and recreate the test simulator
#
# Prerequisites:
#   - Xcode installed with iOS 18.x simulator runtime
#   - Taik app built (run `npx expo run:ios` first)
#

set -e

# Configuration
SIMULATOR_NAME="Taik-E2E-Test"
DEVICE_TYPE="iPhone 16 Pro"
RUNTIME="iOS-18-6"
TAIK_BUNDLE_ID="app.carrel.taik"
MAESTRO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(cd "$MAESTRO_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
RESET_MODE=false
if [[ "$1" == "--reset" ]]; then
    RESET_MODE=true
fi

# Find existing test simulator
EXISTING_UDID=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep -oE '[A-F0-9-]{36}' | head -1)

if [[ -n "$EXISTING_UDID" ]]; then
    if [[ "$RESET_MODE" == true ]]; then
        log_info "Resetting existing simulator: $SIMULATOR_NAME ($EXISTING_UDID)"
        xcrun simctl shutdown "$EXISTING_UDID" 2>/dev/null || true
        xcrun simctl delete "$EXISTING_UDID"
        EXISTING_UDID=""
    else
        log_info "Using existing simulator: $SIMULATOR_NAME ($EXISTING_UDID)"
    fi
fi

# Create new simulator if needed
if [[ -z "$EXISTING_UDID" ]]; then
    log_info "Creating new simulator: $SIMULATOR_NAME"

    # Find the runtime identifier
    RUNTIME_ID=$(xcrun simctl list runtimes | grep "$RUNTIME" | grep -oE 'com\.apple\.CoreSimulator\.SimRuntime\.[^ ]+' | head -1)
    if [[ -z "$RUNTIME_ID" ]]; then
        log_error "Runtime $RUNTIME not found. Available runtimes:"
        xcrun simctl list runtimes
        exit 1
    fi

    # Create simulator
    SIMULATOR_UDID=$(xcrun simctl create "$SIMULATOR_NAME" "$DEVICE_TYPE" "$RUNTIME_ID")
    log_info "Created simulator with UDID: $SIMULATOR_UDID"
else
    SIMULATOR_UDID="$EXISTING_UDID"
fi

# Boot simulator
log_info "Booting simulator..."
xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true

# Wait for boot
log_info "Waiting for simulator to be ready..."
xcrun simctl bootstatus "$SIMULATOR_UDID" -b

# Open Simulator app to show the device
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UDID"

# Verify Notes app is available
log_info "Verifying system apps..."
sleep 3  # Give simulator time to fully initialize

NOTES_CHECK=$(xcrun simctl listapps "$SIMULATOR_UDID" 2>/dev/null | grep "com.apple.mobilenotes" || true)
if [[ -z "$NOTES_CHECK" ]]; then
    log_warn "Notes app not found. This may affect some E2E tests."
    log_warn "Consider using a different iOS runtime or checking Xcode installation."
else
    log_info "Notes app verified ✓"
fi

# Check if Taik app is installed
TAIK_CHECK=$(xcrun simctl listapps "$SIMULATOR_UDID" 2>/dev/null | grep "$TAIK_BUNDLE_ID" || true)
if [[ -z "$TAIK_CHECK" ]]; then
    log_warn "Taik app not installed. Build and install with:"
    log_warn "  cd $PROJECT_DIR && npx expo run:ios --device \"$SIMULATOR_NAME\""
else
    log_info "Taik app installed ✓"
fi

# Save simulator UDID for other scripts
echo "$SIMULATOR_UDID" > "$MAESTRO_DIR/.test-simulator-udid"

# Print summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}E2E Test Environment Ready${NC}"
echo "════════════════════════════════════════════════════════════════"
echo "Simulator:  $SIMULATOR_NAME"
echo "UDID:       $SIMULATOR_UDID"
echo "Runtime:    $RUNTIME"
echo ""
echo "Next steps:"
echo "  1. Install Taik app (if not already):"
echo "     cd $PROJECT_DIR && npx expo run:ios --device \"$SIMULATOR_NAME\""
echo ""
echo "  2. Setup keyboard (required before E2E tests):"
echo "     ~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml"
echo ""
echo "  3. Run E2E tests:"
echo "     ~/.maestro/bin/maestro test .maestro/flows/recording-to-keyboard-e2e.yaml"
echo "════════════════════════════════════════════════════════════════"

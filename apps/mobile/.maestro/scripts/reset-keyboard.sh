#!/bin/bash
# Reset Taik keyboard from simulator
# This removes the Taik keyboard from iOS settings so tests can start fresh

DEVICE_ID=$(xcrun simctl list devices booted -j | grep -o '"udid" : "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$DEVICE_ID" ]; then
    echo "Error: No booted simulator found"
    exit 1
fi

PREFS_PATH=~/Library/Developer/CoreSimulator/Devices/$DEVICE_ID/data/Library/Preferences/.GlobalPreferences.plist

if [ ! -f "$PREFS_PATH" ]; then
    echo "Error: GlobalPreferences.plist not found"
    exit 1
fi

# Read current keyboards, filter out taik, write back
CURRENT_KEYBOARDS=$(plutil -extract AppleKeyboards json -o - "$PREFS_PATH" 2>/dev/null)

if [ -z "$CURRENT_KEYBOARDS" ]; then
    echo "Error: Could not read AppleKeyboards"
    exit 1
fi

# Remove taik keyboard using jq or Python
NEW_KEYBOARDS=$(echo "$CURRENT_KEYBOARDS" | python3 -c "
import json, sys
keyboards = json.load(sys.stdin)
filtered = [k for k in keyboards if 'taik' not in k.lower()]
print(json.dumps(filtered))
")

# Write back
plutil -replace AppleKeyboards -json "$NEW_KEYBOARDS" "$PREFS_PATH"

echo "Removed Taik keyboard from simulator $DEVICE_ID"
echo "Restarting Settings app..."

# Terminate and relaunch Settings to pick up changes
xcrun simctl terminate booted com.apple.Preferences 2>/dev/null
sleep 1

echo "Done. Keyboard reset complete."

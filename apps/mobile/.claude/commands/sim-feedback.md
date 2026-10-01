# iOS Simulator Feedback Capture

Capture a complete diagnostic snapshot of the iOS Simulator state for debugging React Native/Expo issues.

## When to Use

Use this command when:
- The app shows a red error screen
- The app has a blank/white screen
- You need to see what the user sees on the simulator
- Metro bundling issues occur
- You need to debug startup or runtime errors

## Workflow

Execute the feedback capture script and analyze the results:

```bash
/Users/boan/script/taik/scripts/taik/sim-feedback.sh
```

This captures to `/tmp/taik-sim-feedback-YYYYMMDD-HHMMSS/`:
- `simulator.png` - Screenshot of current simulator state
- `simulator.log.txt` - Recent simulator system logs (last 5 minutes)
- `expo-metro.txt` - Expo/Metro process status and port info
- `expo-manifest.json` - Expo manifest if Metro is reachable

## After Capture

1. **Read the screenshot** using the Read tool to see visual errors
2. **Check simulator.log.txt** for crash logs or native errors
3. **Check expo-metro.txt** to verify Metro is running on correct port
4. **Check expo-manifest.json** for bundle configuration issues

## Common Issues to Look For

| Symptom | Check | Likely Cause |
|---------|-------|--------------|
| Red screen | simulator.png + simulator.log.txt | JS error - read the error message |
| White/blank screen | expo-metro.txt | Metro not running or wrong port |
| "Input is required" | expo-metro.txt | Expo CLI blocked on login prompt |
| App won't load | expo-manifest.json | Bundle URL mismatch or Metro down |

## Quick Diagnosis Commands

If you need more targeted info:

```bash
# Just screenshot
xcrun simctl io booted screenshot /tmp/sim-screen.png

# Check if simulator is booted
xcrun simctl list devices booted

# Check Metro port
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

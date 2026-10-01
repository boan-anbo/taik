# Keyboard Extension Setup

This directory contains the native iOS keyboard extension files that need to be manually added to the Xcode project after running `npx expo prebuild`.

## Prerequisites

1. Run `npx expo prebuild` to generate the iOS project
2. Open the Xcode workspace: `ios/taikmobile.xcworkspace`

## Adding the Keyboard Extension Target

### Step 1: Create the Extension Target

1. In Xcode, select the project in the navigator
2. Click the `+` button at the bottom of the targets list
3. Select `iOS` → `Application Extension` → `Custom Keyboard Extension`
4. Name it `TaikKeyboard`
5. Set the bundle identifier to `app.carrel.taik.keyboard`
6. Click Finish

### Step 2: Configure App Groups

1. Select the main app target
2. Go to `Signing & Capabilities`
3. Click `+ Capability` and add `App Groups`
4. Add the group: `group.app.carrel.taik`

5. Select the `TaikKeyboard` target
6. Go to `Signing & Capabilities`
7. Add the same App Groups capability with `group.app.carrel.taik`

### Step 3: Replace Extension Files

1. Delete the auto-generated `KeyboardViewController.swift` in the TaikKeyboard folder
2. Copy `KeyboardViewController.swift` from this directory into the TaikKeyboard folder
3. Ensure the `Info.plist` settings match this directory's `Info.plist`

### Step 4: Update Build Settings

For the TaikKeyboard target:

1. Set `iOS Deployment Target` to `15.0`
2. Set `Swift Language Version` to `5.0`

### Step 5: Configure Entitlements

Create `TaikKeyboard.entitlements` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>group.app.carrel.taik</string>
  </array>
</dict>
</plist>
```

## Testing the Keyboard

1. Build and run the app
2. Go to iOS Settings → General → Keyboard → Keyboards
3. Add New Keyboard → Select "Taik"
4. Enable "Allow Full Access" (required for App Groups)
5. Switch to the Taik keyboard in any app
6. Record a transcription in the main app
7. Use "Insert via Keyboard" button
8. Switch to another app and tap "Insert Transcription" in the Taik keyboard

## Troubleshooting

### Keyboard not appearing
- Ensure the keyboard extension is properly signed
- Check that the bundle identifier matches the provisioning profile

### Transcription not showing
- Verify App Groups is enabled for both targets
- Check that the App Group identifier matches exactly: `group.app.carrel.taik`
- Ensure "Allow Full Access" is enabled for the keyboard

### Build errors
- Clean build folder (Cmd+Shift+K)
- Delete derived data
- Re-run `pod install` in the ios directory

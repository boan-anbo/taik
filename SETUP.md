# Taik - iOS Setup Guide

This guide walks through setting up the Xcode project for Taik, a Stream Deck-style iOS keyboard with on-device speech recognition.

## Prerequisites

- Xcode 15.0+
- macOS Sonoma or later
- Apple Developer account (for device testing)
- iOS 15.0+ device for testing (keyboard extensions behave differently in simulator)

## Step 1: Create Xcode Project

1. Open Xcode
2. File > New > Project
3. Select **iOS > App**
4. Configure:
   - Product Name: `Taik`
   - Organization Identifier: `com.yourname` (or your org)
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Uncheck "Include Tests" for now
5. Save to the `taik` folder (it will create `Taik.xcodeproj`)

## Step 2: Add Keyboard Extension Target

1. File > New > Target
2. Select **iOS > Custom Keyboard Extension**
3. Configure:
   - Product Name: `TaikKeyboard`
   - Embed in Application: `Taik`
4. When prompted "Activate TaikKeyboard scheme?", click **Activate**

## Step 3: Configure App Groups

Both targets need to share data via App Groups.

### Main App Target (Taik):
1. Select `Taik` target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** > **App Groups**
4. Add: `group.com.taik.shared`

### Keyboard Extension Target (TaikKeyboard):
1. Select `TaikKeyboard` target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** > **App Groups**
4. Add: `group.com.taik.shared` (same as main app)

## Step 4: Configure URL Schemes

1. Select `Taik` target
2. Go to **Info** tab
3. Expand **URL Types**
4. Click **+** and add:
   - Identifier: `com.taik.urlscheme`
   - URL Schemes: `taik`

## Step 5: Configure Keyboard Extension

1. Select `TaikKeyboard` target
2. Open `TaikKeyboard/Info.plist`
3. Find `NSExtension` > `NSExtensionAttributes`
4. Add/set these keys:
   - `RequestsOpenAccess`: `YES` (Boolean)
   - `PrimaryLanguage`: `en-US` (String)
   - `IsASCIICapable`: `YES` (Boolean)

## Step 6: Add Shared Code

The `Shared/` folder contains code used by both targets.

1. In Xcode, right-click on the project navigator
2. Select **Add Files to "Taik"...**
3. Navigate to the `Shared` folder
4. Select all files (Constants.swift, DeckButton.swift, SharedStorage.swift)
5. **Important**: Check both targets:
   - ☑️ Taik
   - ☑️ TaikKeyboard
6. Click **Add**

## Step 7: Add Source Files

### Main App Files:
1. Delete the auto-generated `ContentView.swift` and `TaikApp.swift`
2. Add the files from `Taik/` folder:
   - `TaikApp.swift`
   - `Views/ContentView.swift`
   - `Views/RecordingView.swift`
   - `Views/ModelSetupView.swift`
   - `Views/DeckEditorView.swift`
   - `Services/AudioRecorder.swift`
   - `Services/WhisperService.swift`
   - `Services/ModelManager.swift`
3. Target membership: **Taik only**

### Keyboard Extension Files:
1. Delete the auto-generated `KeyboardViewController.swift`
2. Add the files from `TaikKeyboard/` folder:
   - `KeyboardViewController.swift`
   - `Views/KeyboardView.swift`
   - `Views/DeckGridView.swift`
3. Target membership: **TaikKeyboard only**

## Step 8: Add WhisperKit (Optional for v0)

1. File > Add Package Dependencies
2. Enter URL: `https://github.com/argmaxinc/WhisperKit`
3. Select version: **Up to Next Major** from `0.9.0`
4. Add to target: **Taik** (main app only - keyboard extension has memory limits)

**Note**: WhisperKit integration is stubbed out in the current code. Uncomment the WhisperKit imports and implementation in `WhisperService.swift` and `ModelManager.swift` after adding the package.

## Step 9: Configure Microphone Permission

1. Select `Taik` target
2. Go to **Info** tab
3. Add key: `Privacy - Microphone Usage Description`
4. Value: `Taik needs microphone access to transcribe your speech.`

## Step 10: Build & Run

1. Select your device (not simulator for full keyboard testing)
2. Build and run the `Taik` scheme first
3. On device, go to: **Settings > General > Keyboard > Keyboards > Add New Keyboard**
4. Select **Taik**
5. Tap **Taik** > Enable **Allow Full Access**

## Testing the Keyboard

1. Open any app with a text field (e.g., Notes)
2. Tap the text field to show keyboard
3. Tap the globe icon to switch to Taik keyboard
4. You should see the deck button grid and mic button

## Troubleshooting

### Keyboard doesn't appear in Settings
- Make sure the keyboard extension builds successfully
- Check that the extension is embedded in the main app

### App Group not working
- Verify both targets have the same App Group ID
- Check that you're signed in with the same team for both targets

### Mic button doesn't open main app
- Enable "Allow Full Access" in keyboard settings
- The URL scheme must be properly configured

### "Allow Full Access" warning
- This is required for:
  - Opening the main app from keyboard
  - Sharing data via App Groups
- User data stays on device; explain this in your app

## Project Structure

```
Taik/
├── Taik.xcodeproj
├── Taik/                    # Main App
│   ├── TaikApp.swift
│   ├── Views/
│   │   ├── ContentView.swift
│   │   ├── RecordingView.swift
│   │   ├── ModelSetupView.swift
│   │   └── DeckEditorView.swift
│   └── Services/
│       ├── AudioRecorder.swift
│       ├── WhisperService.swift
│       └── ModelManager.swift
├── TaikKeyboard/            # Keyboard Extension
│   ├── KeyboardViewController.swift
│   └── Views/
│       ├── KeyboardView.swift
│       └── DeckGridView.swift
├── Shared/                  # Shared Code (both targets)
│   ├── Constants.swift
│   ├── DeckButton.swift
│   └── SharedStorage.swift
└── SETUP.md
```

## Next Steps

After basic setup works:

1. **Integrate WhisperKit** - Uncomment WhisperKit code and test transcription
2. **Test full flow** - Record in main app, verify text appears in keyboard
3. **Polish UI** - Add animations, haptic feedback, error states
4. **App Store** - Configure proper provisioning profiles and entitlements

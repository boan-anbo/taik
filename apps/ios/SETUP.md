# Taik iOS Project Setup

## Xcode Project Structure

The project has been created with two targets:
- **Taik** - Main app for model download, recording, and deck editing
- **TaikKeyboard** - Custom keyboard extension

## Remaining Xcode Configuration Steps

### 1. Add Source Files to Targets

Open `Taik.xcodeproj` in Xcode and add the following files to the appropriate targets:

#### Main App Target (Taik)
Add these files with "Taik" target checked:
- `Shared/Constants.swift` ✓ (also add to TaikKeyboard)
- `Shared/DeckButton.swift` ✓ (also add to TaikKeyboard)
- `Shared/SharedStorage.swift` ✓ (also add to TaikKeyboard)
- `Taik/Views/ContentView.swift`
- `Taik/Views/RecordingView.swift`
- `Taik/Views/ModelSetupView.swift`
- `Taik/Views/DeckEditorView.swift`
- `Taik/Services/AudioRecorder.swift`
- `Taik/Services/WhisperService.swift`
- `Taik/Services/ModelManager.swift`

#### Keyboard Extension Target (TaikKeyboard)
Add these files with "TaikKeyboard" target checked:
- `Shared/Constants.swift` ✓ (shared with main app)
- `Shared/DeckButton.swift` ✓ (shared with main app)
- `Shared/SharedStorage.swift` ✓ (shared with main app)
- `TaikKeyboard/Views/KeyboardView.swift`
- `TaikKeyboard/Views/StripView.swift`
- `TaikKeyboard/Views/DeckGridView.swift`
- `TaikKeyboard/Views/DeckButtonView.swift`

### 2. Configure URL Scheme

1. Select the **Taik** target
2. Go to **Info** tab
3. Expand **URL Types**
4. Click **+** to add a new URL type:
   - **Identifier**: `app.carrel.taik`
   - **URL Schemes**: `taik`
   - **Role**: Editor

### 3. Add WhisperKit via Swift Package Manager

1. Go to **File > Add Package Dependencies**
2. Enter: `https://github.com/argmaxinc/WhisperKit`
3. Select version: **Up to Next Major** (0.x.x)
4. Add **WhisperKit** library to the **Taik** target (NOT the keyboard extension)

> Note: The keyboard extension cannot use WhisperKit directly due to memory constraints. Transcription happens in the main app.

### 4. Verify App Groups

Ensure both targets have the App Group configured:

1. Select target > **Signing & Capabilities**
2. Verify **App Groups** capability exists
3. Check that `group.app.carrel.taik` is listed

### 5. Keyboard Extension Settings

In `TaikKeyboard/Info.plist`, verify these keys exist:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>IsASCIICapable</key>
        <true/>
        <key>PrefersRightToLeft</key>
        <false/>
        <key>PrimaryLanguage</key>
        <string>en-US</string>
        <key>RequestsOpenAccess</key>
        <true/>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.keyboard-service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).KeyboardViewController</string>
</dict>
```

### 6. Build & Run

1. Select a physical iOS device (keyboard extensions don't work well in simulator)
2. Build and run the **Taik** scheme first
3. On device, go to **Settings > General > Keyboard > Keyboards > Add New Keyboard**
4. Select **Taik**
5. Tap **Taik** and enable **Allow Full Access** (required for mic button)

## Testing the Keyboard

1. Open any app with a text field (e.g., Notes)
2. Tap the globe icon to switch to Taik keyboard
3. You should see the strip bar with buttons
4. Tap the grid icon to expand to deck mode
5. Tap the mic button to open the main app for recording

## Troubleshooting

### Keyboard not appearing
- Ensure the keyboard is added in iOS Settings
- Check that "Allow Full Access" is enabled
- Try restarting the device

### Buttons not showing
- The main app creates default buttons on first launch
- Verify App Groups are configured correctly on both targets

### Transcription not inserting
- Check that the main app has microphone permissions
- Verify the recording completed successfully
- Check App Group data sharing is working

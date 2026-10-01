# Taik iOS Project

## Build Commands

```bash
# Build for iOS device
xcodebuild -scheme Taik -sdk iphoneos build

# Build keyboard extension
xcodebuild -scheme TaikKeyboard -sdk iphoneos build

# Clean and build
xcodebuild -scheme Taik -sdk iphoneos clean build
```

## Project Structure

- **Taik/** - Main app (model download, recording, deck editor, services)
- **TaikKeyboard/** - Custom keyboard extension (Strip/Deck modes)

**Shared files** (Constants.swift, DeckButton.swift, SharedStorage.swift) are duplicated in both folders since each target folder is a synchronized root group in Xcode.

## Important Notes

- Uses folder-based project structure (Xcode 14+)
- New files added to folders automatically appear in Xcode
- App Groups: `group.app.carrel.taik`
- URL Schemes: `taik://record`, `taik://deck`, `taik://flow`

## Testing

Keyboard extensions require testing on a real device:
1. Build and run on device
2. Settings → General → Keyboard → Keyboards → Add New Keyboard
3. Select "Taik"
4. Enable "Allow Full Access"

# Desktop Electron Troubleshooting (macOS)

## Microphone permission denied (macOS)

**Symptom**
- UI shows "Microphone permission denied" even after enabling mic access in System Settings.
- `main.log` shows `permissionRequest` is allowed, but audio still fails.

**Root cause**
- App is signed without the `com.apple.security.device.audio-input` entitlement.
- With hardened runtime, macOS will deny mic access even if the user granted it.

**Fix**
1) Ensure entitlements include audio input:
   - `archive/desktop-electron-legacy/build/entitlements.mac.plist`
   - `archive/desktop-electron-legacy/build/entitlements.mac.inherit.plist`

2) Ensure electron-builder uses these entitlements + hardened runtime:
   - `archive/desktop-electron-legacy/package.json` → `build.mac.entitlements`, `build.mac.entitlementsInherit`, `build.mac.hardenedRuntime`

3) Use a valid signing identity (no prefix):
   - `build.mac.identity`: `Bo An (G9ZN95U2YH)`
   - Avoid `Developer ID Application: ...` prefix (electron-builder rejects it).

4) Reset TCC and re-open the app:
```bash
tccutil reset Microphone app.carrel.taik
open archive/desktop-electron-legacy/release/mac-arm64/Taik.app
```

**Verify entitlements**
```bash
codesign -d --entitlements :- archive/desktop-electron-legacy/release/mac-arm64/Taik.app
```
Look for:
```
com.apple.security.device.audio-input = true
```

## Where logs live

Main-process logs (permission handlers, crashes):
```
~/Library/Application Support/taik-desktop-electron/logs/main.log
```

Tail logs while reproducing:
```bash
tail -f "$HOME/Library/Application Support/taik-desktop-electron/logs/main.log"
```

## Text insertion delays (Soniox finalize)

**Symptom**
- Auto-insert works, but completes ~2–4s after you stop talking.

**Why**
- Soniox realtime mode waits briefly for finalization when the last utterance is still partial.

**Default behavior**
- Min wait: ~0.2s
- Max wait: ~2s (if partial is still pending)

**Adjust**
- Settings → Speech Engine → Finalize Min Wait / Finalize Timeout

## Text insertion pipeline (macOS)

See `docs/TEXT_INSERTION_PIPELINE.md` for the current ordering and fallback logic.

# ExecPlan: Migrate Desktop Shell to Electron (macOS-first)

## Why
Tauri on macOS uses WKWebView. In practice, `getUserMedia()` and related media APIs can fail with `SecurityError: The operation is insecure.` depending on origin / scheme / WKWebView security policies. We want to stop spending time fighting the shell and move to Electron (Chromium) where secure custom schemes + media permissions are well-understood and stable.

## Goals (Phase 1)
- New desktop app runs on Electron:
  - Record + realtime waveform + Soniox transcription
  - Global hotkeys
  - Floating voice/deck windows
  - Settings + history persistence
  - Export logs/diagnostics/bug report (existing UI)
- Keep existing shared packages (`@taik/domain`, `@taik/speech-engine`, `@taik/ui-*`) untouched as much as possible.

## Architecture
- `archive/desktop-electron-legacy` (archived workspace)
  - `src/main/*` Electron main process:
    - window creation (main + floating)
    - global shortcuts
    - IPC handlers for:
      - storage (electron-store)
      - filesystem and dialogs
      - system actions (notifications, quit/restart, app version)
      - window show/hide/focus/isVisible
      - event bus (broadcast `emit/listen`)
      - optional: macOS text insertion via AppleScript paste
  - `src/preload/*` preload bridge (`contextBridge`) exposing a stable API to the renderer.
  - `src/renderer/*` React app (ported from `apps/desktop/src`), updated to use Electron bridge instead of `@tauri-apps/*`.

## Security
- `contextIsolation: true`, `nodeIntegration: false`
- preload exposes only the minimal surface area needed.
- Renderer never imports `electron` directly.

## Implementation Steps
1. Scaffold `archive/desktop-electron-legacy` with scripts:
   - `dev`: Vite dev server + Electron launch
   - `build`: build renderer + build main/preload + `electron-builder` DMG
2. Port the React renderer:
   - Replace Tauri adapters with Electron adapters (`ElectronStorageAdapter`, `ElectronSystemAdapter`, etc.)
   - Replace Tauri event bus with Electron IPC event bus.
3. Implement main/preload IPC:
   - store + hotkeys + windows
   - dialogs + fs (used by Files/Logs exports)
4. Package for macOS:
   - `NSMicrophoneUsageDescription`
   - (optional) `NSAppleEventsUsageDescription` if we do AppleScript-based paste insertion
5. Smoke test:
   - Settings load/save
   - mic permission prompt
   - waveform moves
   - hotkeys toggle recording and floating windows

## Non-goals (Phase 1)
- Rewriting Soniox engine.
- Full native AX insertion (we can start with paste-based insertion).
- Windows/Linux parity (follow-up after macOS is stable).

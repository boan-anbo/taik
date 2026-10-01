# Architecture: Platform Boundaries (Tori as reference)

This document defines what logic belongs in which layer so we can reuse it across:
- Desktop (Tauri)
- iOS/Android (React Native)
- Chrome Extension
- Web

## Layers

### `@taik/speech-engine` (shared, pure)
Owns:
- Providers, transports, sessions, token parsing, stop/finalize semantics
- Provider-agnostic types (`TranscriptResult`, events)

Must not depend on:
- Tauri / React
- App UI or persistence stores

### `@taik/domain` (shared, app logic)
Owns:
- Recording state machines (realtime/async orchestration)
- User settings stores (engine + voice)
- Transcript history store and persistence adapters

Depends on:
- `@taik/speech-engine`
- Capability interfaces (`@taik/capabilities`)

Must not depend on:
- Tauri APIs, window management, OS permission prompts

### Platform adapters (`apps/*` or `packages/platform-*`)
Owns:
- Capability implementations:
  - system clipboard, global hotkeys, window control
  - audio save/playback, media device enumeration/streams
  - direct-insert/text-input implementations (platform-specific)

This layer is where OS permissions and platform constraints belong.

### UI (`apps/*`)
Owns:
- Screens/components
- Wiring domain stores/hooks into UX
- UX-level concerns (copy/export, display modes, help text)

## Tori desktop specifics (Tauri)
Belongs in `apps/desktop`:
- Tauri window routes (main / floating)
- macOS accessibility permission UX and messaging
- Any logic that uses `@tauri-apps/*` APIs directly

Belongs in shared packages:
- Soniox token finalization and stop behavior (`@taik/speech-engine`)
- History entry structure and persistence interface (`@taik/domain`)

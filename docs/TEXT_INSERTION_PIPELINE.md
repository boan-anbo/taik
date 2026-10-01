# Text Insertion Pipeline (macOS)

## Current behavior (Tauri v2)
1) **Accessibility permission check**
   - If not granted, direct insert is skipped.
2) **Direct insert via CGEvent**
   - Text is injected as keystrokes (character-by-character) into the focused app.
3) **Clipboard + Cmd+V fallback**
   - We snapshot the current text clipboard, write the transcript, send Cmd+V, then restore text clipboard.

## Why this order
- Direct insert is lowest-friction when allowed (no clipboard side effects).
- Clipboard paste is more universal but still depends on OS focus.

## Key files
- Tauri accessibility commands: `apps/desktop/src-tauri/src/accessibility.rs`
- Tauri text adapter: `apps/desktop/src/adapters/TauriTextInputAdapter.ts`
- Paste simulation: `apps/desktop/src-tauri/src/accessibility.rs`
- Voice auto-insert: `packages/domain/src/hooks/useVoiceRecording.ts`

## Known constraints
- Secure Input blocks simulated input (we should detect and warn).
- Some apps (custom editors) may reject keystroke-based insert and require paste.
- Focus must remain on target app; floating panels should be non-activating.

## QA
Use: `docs/QA_TEXT_INSERTION.md`

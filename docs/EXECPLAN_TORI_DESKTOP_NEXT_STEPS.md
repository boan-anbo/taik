# ExecPlan: Tori Desktop – Diagnostics, History, Permissions, UX

## Context
Tori desktop (Tauri v2 + React) is becoming the reference “A version” across platforms. We want:
- Fast iteration (modular, stable architecture)
- High confidence debugging (centralized logs/diagnostics)
- Robust voice UX (realtime transcription + correct finalization)
- Useful history (search, export, playback, metadata)
- Clear platform boundaries (shared vs Tori-only vs reusable across RN/extension/web)

## Goals (What “done” means)
1. **Diagnostics/Logs**
   - Users can filter, copy, and **export** logs to a file.
   - Users can export a **diagnostics snapshot** (sanitized settings + basic env + logs).
2. **History**
   - History list is searchable and filterable; selected entry actions are clear.
   - Export history to JSON / text for bug reports or backups.
   - Playback (when audio exists) is reliable and provides clear errors.
3. **Permissions**
   - Direct-insert permissions UI explains macOS behavior in dev vs packaged app.
   - Includes re-check + explicit call-to-action.
4. **Recording UX**
   - “Stopping” states are explicit (`Finalizing…`, `Uploading…`, etc.) and reflect what is happening.
   - Realtime stop waits for final utterance finalization (correctness-first defaults).
5. **Architecture & Reuse**
   - Clear separation between:
     - `@taik/speech-engine` (provider/transport/session logic, pure)
     - `@taik/domain` (state machines + history stores + settings, platform-agnostic)
     - `apps/desktop` (Tauri adapters + windows + direct insert permissions, Tori-only)
   - Lightweight docs for what belongs where.
6. **Regression checks**
   - Unit tests cover the tricky Soniox websocket transcript behavior and stop/finalize semantics.
   - A short manual QA checklist exists for product behaviors not suited for unit tests.

## Non-goals (for this pass)
- Full custom titlebar/window chrome replacement for the main window (requires coordinated UI work).
- Full end-to-end UI automation suite (Playwright, etc.). We keep lightweight unit tests + manual QA for now.
- Cross-platform refactor into a new `@taik/platform-tauri` package (possible later).

## Implementation Phases

### Phase 1: Diagnostics/Logs (desktop)
- Add “Export logs” and “Export diagnostics snapshot” actions.
- Diagnostics snapshot should redact secrets (API keys).

### Phase 2: History UX (desktop)
- Add filters and export actions for transcripts.
- Improve “selected entry” actions (copy, delete, playback affordances).

### Phase 3: Permissions clarity (desktop)
- Update direct insert permission help text:
  - In `tauri dev`, macOS Accessibility permission may appear under the terminal (e.g., Ghostty).
  - In packaged builds, it should appear as the app bundle.

### Phase 4: Recording UX polish (desktop)
- Rename status labels for stop flows:
  - Realtime: `Finalizing…`
  - Async: `Uploading…` / `Processing…`
- Ensure stop logic is correctness-first by default when pending partial exists.

### Phase 5: Regression + docs
- Add tests where we already have infrastructure (`packages/speech-engine` via Vitest).
- Add a manual QA checklist document.

## File/Module Ownership (Reuse boundaries)
- Shared engine: `packages/speech-engine/*`
- Shared domain: `packages/domain/*`
- Desktop-only: `apps/desktop/*`
  - Tauri-specific adapters, permissions, windows, OS integration


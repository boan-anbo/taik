# ExecPlan: macOS Input Method (IMK) for Reliable Text Insertion

## Why
Our core feature is inserting dictated/AI-generated text into any target app. Paste simulation (CGEvent/clipboard) is unreliable across apps and system states (focus race, secure input). The most standard, reliable macOS path is an Input Method (IMK) that participates in the system text pipeline.

## Goals (Phase 1)
- Provide a native IMK bundle that can insert text into the focused app via `insertText`.
- Keep Electron app as the UI + speech engine, and use IPC to send recognized text to IMK.
- Ship on macOS with a clear user flow to enable the Taik input source.
- Preserve our current desktop UX (floating window, hotkeys), but insertion is handled by IMK.

## Non-goals (Phase 1)
- Windows/Linux input method support.
- Full replacement of Electron UI.
- Perfect formatting behavior for all apps (we will build a QA matrix).

## Architecture
- `archive/desktop-electron-legacy` (legacy UI + speech engine, archived)
  - Emits recognized text + metadata over local IPC to IMK helper.
  - Continues to manage recording, settings, history, prompts, etc.
- `apps/desktop-imk` (new native macOS Input Method target)
  - IMK server bundle installed under `/Library/Input Methods/` (or `~/Library/Input Methods/` for dev).
  - Implements `IMKInputController` and calls `insertText(_:replacementRange:)`.
  - Exposes a local IPC endpoint (XPC or Unix domain socket) for Electron to send text.
  - Optional: small status UI / menu for debugging + connection status.

## UX Flow
1) User installs Taik IMK bundle.
2) User enables Taik Input Method in System Settings → Keyboard → Input Sources.
3) When recording completes, Electron sends text to IMK.
4) IMK inserts text into the focused app.

## Implementation Steps
### Phase 0: Prototype (1–2 days)
1) Create minimal IMK app that inserts a fixed string on hotkey.
2) Verify insertion in TextEdit, Notes, Chrome, Slack.
3) Document required permissions and installation steps.

### Phase 1: IMK + IPC (3–5 days)
1) Create `apps/desktop-imk` (Swift):
   - IMK server bundle + input controller.
   - `insertText` pipeline.
2) Implement IPC:
   - Choose transport: XPC (preferred) or Unix socket.
   - Define message schema `{ text, language, timestamp, source }`.
3) Electron ↔ IMK handshake:
   - Connection check / health ping.
   - Retry queue if IMK not active.

### Phase 2: Integration (3–5 days)
1) Wire recording completion to IMK insertion.
2) Add fallback: if IMK not active, copy to clipboard + UI prompt.
3) Add settings screen:
   - “Enable Taik Input Method” checklist
   - IMK status indicator (connected / not connected)

### Phase 3: Packaging + QA (3–5 days)
1) Bundle IMK into desktop build (or separate installer).
2) Signing + notarization for IMK bundle.
3) QA matrix:
   - AppKit (TextEdit, Notes)
   - WebKit (Safari, Chrome)
   - Electron (Slack, Notion)
   - Qt (WeChat)
   - Secure input field behavior

## Risks / Open Questions
- IMK requires explicit user enablement (input source switch).
- IPC lifecycle across app restarts (Electron vs IMK).
- Distribution strategy for IMK bundle (bundled vs separate installer).

## Success Criteria
- 95%+ insertion success across QA apps without manual paste.
- Clear user onboarding that enables IMK once and works reliably after.

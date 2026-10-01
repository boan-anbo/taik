# Research: macOS Text Insertion (Non-IMK) + Tambourine-Voice

## Scope
We evaluated the open-source Tauri app `tambourine-voice` to understand how it inserts text into other apps on macOS, and how that approach compares to our current Tauri direct-insert pipeline.

Repo inspected (local clone): `github.com/kstonekuan/tambourine-voice`

## What Tambourine-Voice Does
1) **Clipboard + paste simulation (no IMK, no AX)**
   - Uses `arboard` to write text to clipboard.
   - Uses `enigo` (HIToolbox on macOS) to synthesize `Cmd+V`.
   - Restores previous clipboard contents after a short delay.
   - File: `app/src-tauri/src/commands/text.rs`

2) **Runs paste logic on the main thread**
   - Calls `run_on_main_thread` before invoking HIToolbox APIs.
   - Likely avoids macOS API threading issues for low-level input.
   - File: `app/src-tauri/src/commands/text.rs`

3) **Non-activating overlay panel (reduces focus theft)**
   - Uses `tauri_nspanel` to convert overlay into a non-activating NSPanel.
   - `focused(false)`, `focusable(false)`, and `nonactivating_panel` style.
   - Keeps overlay always-on-top and visible on all workspaces without stealing focus.
   - File: `app/src-tauri/src/lib.rs`

4) **Paste happens on key release**
   - “Paste last” hotkey inserts only after the shortcut is released, reducing focus race.
   - File: `app/src-tauri/src/lib.rs`

## Why It Might Feel More Reliable
- The overlay panel does not become the key window, so the target app keeps focus.
- Paste is delayed until the user releases the hotkey, which gives the target app time to settle.
- macOS input simulation runs on the main thread (HIToolbox requirement in their stack).

## Gaps / Risks in Their Approach
- No secure input detection (paste fails silently in secure input contexts).
- No AX direct-insert fallback.
- No target app activation or focus validation before paste.
- Clipboard restore is text-only (rich clipboard types are dropped).
- Still requires Accessibility permission.

## Comparison to Our Current Approach
- We use CGEvent direct insert (character-by-character) in Tauri.
- Clipboard fallback simulates Cmd+V and restores the text clipboard.
- Floating windows are transparent and always-on-top; we avoid focus theft.
- See `docs/TEXT_INSERTION_PIPELINE.md` for current ordering.

## Recommendations (Non-IMK Track)
1) **Make floating UI truly non-activating on macOS**
   - Tauri: prefer non-activating panel behavior; avoid forcing focus when showing the floating window.

2) **Trigger paste only after key release / recording completion**
   - Avoid paste during key-down or while overlay is active.
   - Add a short “settle” delay (50–100ms) after re-activating the target app.

3) **Improve clipboard handling**
   - Preserve full pasteboard types (RTF, HTML, images), not just text.
   - Mark the temporary paste as transient where possible.

4) **Fallback tier for short strings**
   - For short strings (e.g., < 80 chars), character-by-character keystrokes are acceptable.
   - For longer blocks, prefer paste (with clipboard restore).

5) **Add explicit focus validation**
   - Record frontmost app before recording.
   - Confirm frontmost app still matches before posting paste events.

## Evidence Pointers (Tambourine-Voice)
- Paste implementation: `app/src-tauri/src/commands/text.rs`
- Overlay non-activating panel: `app/src-tauri/src/lib.rs`

## Next Step Proposal
Use the QA checklist in `docs/QA_TEXT_INSERTION.md` after any insertion changes.

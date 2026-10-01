# QA: Text Insertion (macOS)

## Goal
Verify that auto-insert is reliable across common app frameworks after each change.

## Preconditions
- Accessibility permission granted for Taik.
- Output destination: Auto-insert.
- Floating voice panel visible but non-activating (does not steal focus).

## Test Matrix (minimal)
1) **TextEdit (AppKit)**
   - Start recording, speak one sentence, stop.
   - Expect: text appears immediately at cursor.

2) **Chrome / Safari (WebKit/Chromium)**
   - Test in a normal textarea and a rich editor (e.g., Google Docs).
   - Expect: text inserts at caret without focus loss.

3) **Slack / Discord (Electron)**
   - Focus composer, record, stop.
   - Expect: insert works even with floating window visible.

4) **WeChat (Qt) or other non-native app**
   - Focus input, record, stop.
   - Expect: insert works; if not, copy fallback should be correct.

## Regression Checks
- Clipboard fallback pastes and restores text clipboard (text-only).
- Secure Input state blocks simulated input (no silent failures).
- Insert still works after switching spaces / fullscreen.

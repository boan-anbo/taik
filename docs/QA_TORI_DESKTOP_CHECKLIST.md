# Manual QA Checklist: Tori Desktop (Tauri)

Use this checklist after changes to voice, devices, history, or permissions.

## Setup
- Ensure Soniox API key is configured in Settings.
- Ensure mic permission is granted.
- Optional: enable “Save audio files” so history playback can be tested.

## Recording (Main “Record” screen)
- Start recording, speak 3+ sentences, stop:
  - Transcript includes *all* sentences (not only the last one).
  - Stop state shows **Finalizing…** (realtime) and finishes without missing the last sentence.
- Stop mid-utterance:
  - App waits for last utterance to finalize (may take a few seconds) and then completes.
- Copy: “Copy to Clipboard” copies full transcript.
- Save: “Save to Files” adds entry to history.

## Floating Voice Window
- Toggle via hotkey:
  - First press shows window and starts recording.
  - Second press stops and produces output (insert/copy/history based on settings).
- Waveform / monitoring:
  - Selected input device shows signal when speaking.
- Stop:
  - Finishes after the last utterance finalizes.

## Input Device Management
- In Settings → Voice Input:
  - Device selector shows available inputs (after permission).
  - “Test Mic” waveform responds to speech.
  - Switching device changes waveform source.

## Direct Insert Permission (macOS)
- If output destination includes Insert:
  - Settings shows Direct insert permission block.
  - “Grant access” opens the OS prompt (or directs to System Settings).
  - “Refresh” updates status after changing System Settings.
  - Dev note: permission may appear under the terminal app in `tauri dev`.

## History (“Files” screen)
- Search:
  - Search by transcript text.
- Filters:
  - Source filter (Live / Files) works.
  - Audio filter (With audio / No audio) works.
- Entry detail:
  - Copy works.
  - Delete removes the entry (and audio file if present).
- Playback (when audio exists):
  - Play/Pause works.
  - Seek works.
  - Errors show a clear message (no crash).
- Export:
  - Export selected → JSON file contains the entry + metadata.
  - Export (all visible) → JSON file contains the filtered list.

## Logs / Diagnostics
- Logs screen:
  - Filters work (window, level, search).
  - Export Logs creates a `.txt`.
  - Export Diagnostics creates a `.json` with redacted API keys.


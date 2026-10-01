# QA: Tauri Floating Voice + History

## Preconditions
- Tauri desktop build running (dev or packaged).
- Microphone permission granted.
- Soniox API key configured.
- Voice settings: output destination = insert (or both).

## Floating Voice UI
1) Open floating voice window (Cmd/Ctrl+Shift+V).
2) Verify the window looks like a floating input bar (no window chrome).
3) Drag the floating bar from empty space; buttons still clickable.
4) Close button hides the bar without stealing focus.

## Waveform / Mic Signal
1) Click Test (monitor) and speak.
2) Waveform should move and signal dot should turn on when speaking.
3) Stop monitoring; waveform stops updating.
4) Start recording; waveform moves during capture.

## Realtime Record + Insert
1) Focus TextEdit.
2) Start/stop recording from floating bar.
3) Text appears at caret (or clipboard fallback status if direct insert fails).

## History + Audio
1) Confirm new entry appears in Files.
2) If “Save audio files” enabled, playback works.
3) Export audio and copy audio path both succeed.

## Retranscription Versions
1) Select entry with audio.
2) Re-transcribe using default model.
3) New version appears; switching versions updates displayed text.
4) Export selected entry includes updated active version text.

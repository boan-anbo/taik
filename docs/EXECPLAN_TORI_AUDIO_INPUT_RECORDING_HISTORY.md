# ExecPlan: Tori Desktop Audio Input + Recording + History

**Last updated:** 2025-12-17

## Problem Statement

Tori desktop needs a complete “voice input loop”:
- Global hotkey to **show voice panel** and **start/stop recording** reliably.
- **Selected microphone** should be used in both realtime + async modes.
- **Real-time waveform / level** to verify the selected input has signal (“pass-through”).
- Save transcript (and optionally audio) to **history**, and expose history UX (including playback when audio is saved).
- Clearly separate **shared logic** (domain/capability level) vs **Tori-specific** (Tauri OS integration) vs other platforms (RN / extension).

## Goals

1. Audio input device selection (persisted) + permission flow.
2. Recording uses the selected device in **both** `realtime` and `async` modes.
3. Waveform/level works in realtime and can be used as a “mic test”.
4. Hotkey reliably starts/stops recording even when the voice panel is opened for the first time.
5. History contains transcript entries and (when enabled) saved audio with playback UI.

## Non-Goals

- Perfect cross-window stream sharing (Tauri windows are separate JS runtimes).
- Full MV3 extension integration (only shared building blocks are created).
- React Native device enumeration parity (RN uses different native APIs and often doesn’t expose multiple inputs).

## Architecture (Shared vs Platform)

**Shared (reusable across React DOM: Tauri/Web/Extension)**
- `@taik/capabilities`: `IMediaDeviceAdapter` + `MediaStreamOptions` contracts.
- `@taik/domain`:
  - `useAudioStreamManager` (selection + persistence + stream lifecycle)
  - `useRecording` now supports `getMediaStream()` for lazy stream creation
  - `useRecordingSession` orchestrates recording + history + waveform + monitoring
- `@taik/platform-web`: `BrowserMediaDeviceAdapter` (DOM implementation of `IMediaDeviceAdapter`)

**Tori Desktop (Tauri-specific)**
- `apps/desktop` adapters: `TauriSystemAdapter`, `TauriTextInputAdapter`, `TauriAudioAdapter`
- Global shortcut wiring + voice panel window lifecycle

## Implementation Plan (High Level)

1. Add `@taik/platform-web` with `BrowserMediaDeviceAdapter`.
2. Extend domain hooks:
   - `useRecording(getMediaStream)` for on-demand stream acquisition.
   - `useRecordingSession(deviceAdapter)` to:
     - Use selected mic for realtime + async.
     - Provide monitoring API (`startMonitoring/stopMonitoring`) and signal detection.
3. Desktop integration:
   - `VoiceWidget` shows compact device selector + monitoring + waveform.
   - Settings adds “Test Mic” waveform for immediate verification.
   - Hotkey reliability: voice panel emits `voice:panel-ready`; main window queues first toggle until ready.
4. History UX:
   - Files screen plays back saved audio (`metadata.audioUri`) and deletes audio file on transcript deletion.

## Reuse Matrix

| Concern | Shared | Tori-only |
|---|---|---|
| Device enumeration + selection contract | `@taik/capabilities` | — |
| DOM device implementation | `@taik/platform-web` | — |
| Stream lifecycle + persistence | `@taik/domain` | — |
| Recording + transcription orchestration | `@taik/domain` | — |
| OS-global hotkey registration | — | `TauriSystemAdapter` |
| Insert text into focused app | — | `TauriTextInputAdapter` |
| Audio file persistence/playback | — | `TauriAudioAdapter` |

## QA Checklist (Manual)

1. Settings → Voice Input:
   - Grant mic permission; device labels populate.
   - Select non-default mic; restart app; selection persists.
   - “Test Mic” shows waveform and “Input detected” when speaking.
2. Floating Voice (Cmd/Ctrl+Shift+V):
   - First press opens panel and starts recording.
   - Second press stops recording; transcript is inserted/copied per settings and saved to history.
   - Waveform shows during realtime recording; “Test” monitoring shows waveform when not recording.
3. Files:
   - New transcript entries appear with correct metadata.
   - If “Save audio files” enabled: playback works; deleting transcript removes audio file too.

## Risks / Notes

- Monitoring keeps mic stream open while active; UX should make this explicit (current UI uses “Test/Stop”).
- If device changes mid-recording, stream restart can disrupt capture; UI disables device switching while recording/processing.


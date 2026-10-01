# Handoff: Audio Device Management Feature

**Date:** December 17, 2024 (updated December 17, 2025)
**Status:** Integrated into VoiceWidget + recording session; needs end-to-end QA in Tauri

---

## Overview

This feature adds the ability to enumerate, select, and persist audio input devices (microphones) for voice recording. Users can now choose which microphone to use instead of always using the system default.

## What Was Implemented

### 1. Capability Layer (`@taik/capabilities`)

**New file:** `packages/capabilities/src/audio/IMediaDeviceAdapter.ts`

Defines the platform-agnostic interface for audio device management:

```typescript
interface IMediaDeviceAdapter {
  isSupported(): boolean;
  enumerateAudioInputs(): Promise<AudioInputDevice[]>;
  getUserMedia(options?: MediaStreamOptions): Promise<MediaStream>;
  onDeviceChange(callback: () => void): () => void;
  requestPermission(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
}
```

**Exports added to:** `packages/capabilities/src/audio/index.ts` and `packages/capabilities/src/index.ts`

### 2. Domain Layer (`@taik/domain`)

**New hook:** `packages/domain/src/hooks/useAudioStreamManager.ts`

Manages audio device state and MediaStream lifecycle:
- Enumerates available audio input devices
- Handles device selection and persistence
- Creates and manages MediaStream
- Monitors for device connect/disconnect events
- Handles microphone permission requests

**Modified:** `packages/domain/src/types/voice.ts`
- Added `audioInputDeviceId?: string` to `VoiceSettings` interface

**Modified:** `packages/domain/src/hooks/useRecording.ts`
- Added `mediaStream?: MediaStream` option to allow passing an external stream
- Added `stopStreamOnStop?: boolean` option

**Modified:** `packages/domain/src/index.ts`
- Exported `useAudioStreamManager` and related types

### 3. Speech Engine (`@taik/speech-engine`)

**New file:** `packages/speech-engine/src/audio/sources/media-stream-source.ts`

Audio source that wraps an existing MediaStream instead of creating its own. Key features:
- Accepts pre-created MediaStream
- Option to stop tracks on stop (`stopTracksOnStop`)
- Converts audio to PCM16 format for Soniox API

**Modified:** `packages/speech-engine/src/core/session.ts`
- Added `startMediaStream(options: MediaStreamSourceOptions)` method to `SonioxSession`

**Exports added to:** `packages/speech-engine/src/audio/index.ts` and `packages/speech-engine/src/index.ts`

### 4. Desktop App (`apps/desktop`)

**Adapter moved to reusable web platform package:** `packages/platform-web/src/media/BrowserMediaDeviceAdapter.ts`

Browser implementation of `IMediaDeviceAdapter` using `navigator.mediaDevices` API.

**New component:** `apps/desktop/src/components/AudioDeviceSelector.tsx`

Reusable dropdown component with:
- Full mode (for Settings page) - shows device labels
- Compact mode (for VoiceWidget) - icon-only with dropdown
- Permission request button when not granted
- "No devices found" state

**Styles:** `apps/desktop/src/components/AudioDeviceSelector.css`

**Modified:** `apps/desktop/src/screens/SettingsScreen.tsx`
- Added Audio Input Device selector in Voice Input section
- Uses `useAudioStreamManager` hook with `BrowserMediaDeviceAdapter`
- Added “Test Mic” waveform + signal indicator

**Modified:** `apps/desktop/src/components/VoiceWidget.tsx`
- Wired compact Audio Input selector into the floating Voice widget
- Added input monitoring (“Test” / “Stop”) + signal indicator
- Waveform now works in **realtime** mode as well (shared stream)

**Modified:** `apps/desktop/src/screens/VoiceScreen.tsx` and `apps/desktop/src/hooks/useGlobalHotkeys.ts`
- Added a simple “voice panel ready” handshake so the first hotkey press reliably starts recording

**Modified:** `apps/desktop/src/screens/FilesScreen.tsx`
- Added playback controls for history entries with `metadata.audioUri`
- Deletes the associated audio file when deleting a transcript entry

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Settings Screen                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AudioDeviceSelector Component               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            useAudioStreamManager Hook                    │   │
│  │  - devices: AudioInputDevice[]                          │   │
│  │  - selectedDeviceId: string | undefined                 │   │
│  │  - selectDevice(id): Promise<void>                      │   │
│  │  - startStream(): Promise<MediaStream>                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│              ┌───────────────┴───────────────┐                 │
│              ▼                               ▼                  │
│  ┌──────────────────────┐      ┌─────────────────────────┐    │
│  │ BrowserMediaDevice   │      │     VoiceSettings       │    │
│  │      Adapter         │      │  (audioInputDeviceId)   │    │
│  │ (navigator.media     │      │  Persisted via Zustand  │    │
│  │  Devices API)        │      └─────────────────────────┘    │
│  └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Voice Recording Flow                       │
│                                                                 │
│  useRecordingSession                                           │
│         │                                                       │
│         ▼                                                       │
│  useRecording (accepts optional mediaStream)                   │
│         │                                                       │
│         ▼                                                       │
│  SonioxSession.startMediaStream() or startMicrophone()         │
│         │                                                       │
│         ▼                                                       │
│  MediaStreamSource (wraps existing stream)                     │
│         │                                                       │
│         ▼                                                       │
│  WebSocketTransport → Soniox API                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Changed/Created

### New Files
| File | Description |
|------|-------------|
| `packages/capabilities/src/audio/IMediaDeviceAdapter.ts` | Interface definition |
| `packages/domain/src/hooks/useAudioStreamManager.ts` | React hook for device management |
| `packages/speech-engine/src/audio/sources/media-stream-source.ts` | MediaStream wrapper |
| `apps/desktop/src/adapters/BrowserMediaDeviceAdapter.ts` | Browser implementation |
| `apps/desktop/src/components/AudioDeviceSelector.tsx` | UI component |
| `apps/desktop/src/components/AudioDeviceSelector.css` | Styles |

### Modified Files
| File | Changes |
|------|---------|
| `packages/capabilities/src/audio/index.ts` | Added exports |
| `packages/capabilities/src/index.ts` | Added exports |
| `packages/domain/src/types/voice.ts` | Added `audioInputDeviceId` field |
| `packages/domain/src/hooks/useRecording.ts` | Added `mediaStream` option |
| `packages/domain/src/hooks/index.ts` | Added exports |
| `packages/domain/src/index.ts` | Added exports |
| `packages/speech-engine/src/audio/sources/index.ts` | Added exports |
| `packages/speech-engine/src/audio/index.ts` | Added exports |
| `packages/speech-engine/src/core/session.ts` | Added `startMediaStream()` |
| `packages/speech-engine/src/index.ts` | Added exports |
| `apps/desktop/src/adapters/index.ts` | Added export |
| `apps/desktop/src/components/index.ts` | Added export |
| `apps/desktop/src/screens/SettingsScreen.tsx` | Integrated device selector |

---

## How to Test

### 1. Build packages
```bash
npm run build -w @taik/capabilities -w @taik/speech-engine -w @taik/domain
```

### 2. Run desktop app
```bash
npm run tauri dev -w taik-desktop
```

### 3. Test scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| View devices | Open Settings → Voice Input | Shows "Audio Input Device" dropdown |
| Grant permission | Click "Grant Microphone Access" | Browser permission prompt appears |
| Select device | Choose a device from dropdown | Selection persists after restart |
| Device disconnect | Unplug selected device | Resets to "System Default" |
| No devices | Block microphone in system settings | Shows "No audio devices found" |

---

## Known Issues / TODOs

### Must Fix
1. **End-to-end QA in Tauri** - Validate device selection, permission, monitoring, and recording (realtime + async) on macOS/Windows.

### Should Fix
2. **Unit tests needed** - No unit tests were written for:
   - `useAudioStreamManager` hook
   - `useRecordingSession` stream/monitor behavior
   - `MediaStreamSource` class
   - `BrowserMediaDeviceAdapter` (now in `@taik/platform-web`)

### Nice to Have
3. **Device labels before permission** - Device labels are empty until permission is granted. Could show device IDs as fallback.

4. **Selector inline meter** - Optionally embed the level meter inside the selector dropdown (currently a separate “Test Mic” / “Test” control).

---

## Next Steps for Takeover Team

### Priority 1: Complete VoiceWidget Integration
```typescript
// In VoiceWidget.tsx, add:
const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);
const streamManager = useAudioStreamManager({ deviceAdapter });

// Pass stream to useRecordingSession:
const session = useRecordingSession({
  // ... existing options
  mediaStream: streamManager.stream,
});

// Connect visualization to the same stream:
useEffect(() => {
  if (streamManager.stream) {
    visualization.connect(streamManager.stream);
  }
}, [streamManager.stream]);
```

### Priority 2: Add Context for Stream Sharing
Create `AudioStreamContext.tsx` to share stream manager across components:
```typescript
const AudioStreamContext = createContext<UseAudioStreamManagerReturn | null>(null);

export function AudioStreamProvider({ children }) {
  const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);
  const streamManager = useAudioStreamManager({ deviceAdapter });

  return (
    <AudioStreamContext.Provider value={streamManager}>
      {children}
    </AudioStreamContext.Provider>
  );
}
```

### Priority 3: Write Tests
- Test device enumeration
- Test device selection persistence
- Test stream creation with specific device
- Test error handling (permission denied, device not found)

---

## Contact

This feature was implemented as part of the audio device management initiative. For questions about the original implementation approach, refer to the plan file:

`/Users/boan/.claude/plans/parsed-swimming-marble.md`

---

*Last updated: December 17, 2024*

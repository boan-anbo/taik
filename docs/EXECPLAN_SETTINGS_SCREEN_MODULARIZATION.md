# ExecPlan: Desktop Settings Screen Modularization

**Last updated:** 2025-12-17

## Problem Statement

`apps/desktop/src/screens/SettingsScreen.tsx` is ~1300+ lines. This makes:
- changes risky (hard to reason about side-effects),
- reviews slow,
- reuse difficult (sections are tightly coupled),
- iteration brittle (small UI tweaks touch the whole file).

We want Settings to be a stable “startup-grade” surface: easy to extend while remaining robust.

## Goals

1. Keep behavior identical (no regressions in settings, hotkeys, device selection, mic test, direct insert permission UX).
2. Reduce the main Settings screen file to a small orchestrator (<200 LOC).
3. Split into modular **sections** + small **hooks** that can be reused in other React DOM platforms (web/extension) where applicable.
4. Create clean boundaries between:
   - **Shared UI logic** (React/DOM, no Tauri specifics)
   - **Tori desktop-only** logic (Tauri window events, macOS Accessibility)

## Non-Goals

- A full visual redesign of Settings (this is a structural refactor).
- Moving all UI primitives into `@taik/ui-dom` (only extract if clearly reusable and low-risk).

## Proposed File Layout

Keep the route import stable by leaving `apps/desktop/src/screens/SettingsScreen.tsx` as a re-export.

```
apps/desktop/src/screens/
  SettingsScreen.tsx              // re-export
  settings/
    SettingsScreen.tsx            // orchestrator (layout + composition)
    sections/
      SpeechEngineSection.tsx
      LanguageSection.tsx
      VoiceSection.tsx            // display mode/widget mode/recording mode
      VoiceInputSection.tsx       // mic device + Test Mic + signal UI
      OutputSection.tsx           // output destination + auto-hide + save audio + direct-insert permission block
      HotkeysSection.tsx          // hotkey recorder + test toggle
      AboutSection.tsx
    hooks/
      useHotkeyRecorder.ts
      useMicTest.ts
      useDirectInsertPermission.ts
```

## Architecture Notes (Reuse Matrix)

**Reusable (React DOM)**
- `useHotkeyRecorder` (pure key-event → shortcut string)
- `useMicTest` (WebAudio visualization + stream lifecycle) *if adapter passed in*

**Desktop-only**
- `useDirectInsertPermission` uses `TauriTextInputAdapter` (macOS Accessibility).
- `HotkeysSection`’s “Test Voice Toggle” (Tauri window + emit event).

## Implementation Steps

1. Introduce new folder structure and move code into section components with typed props.
2. Extract hook logic:
   - hotkey recording effect + normalization
   - mic test stream lifecycle + visualization attach
   - direct insert permission polling / request
3. Keep `SettingsScreen` composition identical in order and copy.
4. Run `npm -w taik-desktop run typecheck` and `npm -w taik-desktop run build`.
5. Manual smoke:
   - Change API key / mode / language hints
   - Mic device selector + Test Mic waveform
   - Output destination + direct insert status + “Grant access”
   - Voice hotkey recorder + Test Voice Toggle


# ExecPlan: Tauri Production-Grade Floating Voice + History + Migration

**Last updated:** 2025-12-19

## Context
We are standardizing desktop on **Tauri 2.x** (macOS-first) and shipping a production-grade voice experience:
- Floating voice UI should look like a real, elegant **floating input bar** (not a window chrome).
- Waveform must be **trustworthy and lively**, reflecting real input amplitude.
- History must be **robust**: retain audio, allow re-transcription with different models, and preserve versions.
- Electron should be **fully deprecated** in build/scripts and workspace wiring.

## Goals (What “done” means)
1. **Floating Voice UI**
   - Floating window has no window-like chrome; looks like a premium input pill.
   - Dragging works; controls remain clickable.
   - Visual language matches “voice input” (mic, waveform, live preview).
2. **Waveform Reliability**
   - Waveform moves in real time during recording/monitoring.
   - Sensitivity can be tuned; small input still visible.
   - If WebAudio is blocked, UI prompts for user activation.
3. **History (Production-Grade)**
   - Every voice recording has durable audio stored (when enabled).
   - Entries support multiple **transcription versions** (engine/model/language).
   - Re-transcribe from history with model selection + progress.
   - UI remains fast with search + filters.
4. **Tauri 2.x First-Class**
   - Root scripts point to Tauri; Electron removed from default workflows.
   - Workspace excludes Electron to avoid accidental builds.
   - Docs updated to reflect Tauri-only desktop path.
5. **QA + Docs**
   - Manual QA checklist for floating UI, waveform, history, and retranscribe.
   - Updated docs for workflow + troubleshooting.

## Non-goals (for this pass)
- Full native IME / Input Method implementation.
- New cross-platform automation (Playwright/E2E) pipeline.
- Changing the entire shared design system tokens.

## Implementation Phases

### Phase 1: Tauri Migration Hardening
- Update root workspace/scripts to target `apps/desktop` (Tauri) only.
- Mark Electron as deprecated/archived (no default build path).
- Update docs to reflect new desktop entry points.

### Phase 2: Floating Voice UI Redesign
- Replace header/chrome with a clean floating input bar UI.
- Make the **entire bar** draggable (excluding interactive controls).
- Add soft shadows/blur for “floating” perception.

### Phase 3: Waveform + Audio Visualization Fix
- Upgrade visualization pipeline (faster refresh + sensitivity tuning).
- Add fallback behavior when audio is blocked or silent.
- Ensure waveform reflects real mic input during recording and monitoring.

### Phase 4: History + Retranscription (Robust)
- Extend transcript model to store **versions** and audio metadata.
- Save audio in **realtime mode** (parallel capture) when history audio is enabled.
- Add retranscription UI with model selection + progress.

### Phase 5: QA + Docs
- QA checklist for:
  - Floating UI visual / drag / focus behavior.
  - Waveform movement (monitor + record).
  - History audio playback and retranscription.
  - Model override usage.
- Update relevant docs and troubleshooting notes.
 - Add: `docs/QA_TAURI_VOICE.md`

## Risks / Notes
- History model migration requires backward compatibility and safe defaults.
- Realtime audio capture must not interfere with streaming transcription.
- Tauri window transparency + blur varies by OS versions; need fallback styles.

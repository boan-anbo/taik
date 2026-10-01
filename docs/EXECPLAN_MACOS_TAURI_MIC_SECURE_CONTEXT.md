# ExecPlan: macOS Microphone Secure Context (Tauri)

## Problem
On macOS, Tauri uses WKWebView. When the frontend is loaded via a non-secure origin (not HTTPS / not localhost), Web APIs like `navigator.mediaDevices.getUserMedia()` can throw `SecurityError` with the message **“The operation is insecure.”**. This blocks microphone capture for waveform + Soniox streaming.

In practice, WKWebView does not treat custom schemes (e.g. `tauri://...`) as secure contexts for media capture, so getUserMedia can fail even in production bundles.

## Goal
Make the frontend load from a **localhost** origin so that `getUserMedia()` is permitted and mic permissions work reliably on macOS, without rewriting the audio pipeline yet.

## Approach
Use `tauri-plugin-localhost` to serve app assets from a localhost HTTP server, and then create windows that load:

- `http://127.0.0.1:<port>/` (main)
- `http://127.0.0.1:<port>/deck-panel` (floating-deck)
- `http://127.0.0.1:<port>/voice-panel` (floating-voice)

This preserves the existing JS/TS audio pipeline (AudioDeviceSelector → useAudioStreamManager → getUserMedia → visualization + Soniox).

## Implementation Steps
1. Add `tauri-plugin-localhost` to `apps/desktop/src-tauri/Cargo.toml`.
2. Set window configs to `create: false` in `apps/desktop/src-tauri/tauri.conf.json`.
3. In `apps/desktop/src-tauri/src/lib.rs` setup:
   - initialize the localhost plugin (bind to `127.0.0.1` and a fixed port)
   - create the windows from config via `WebviewWindowBuilder::from_config`, but override the `url` to the localhost HTTP URLs.
4. Rebuild the DMG (`npm -w taik-desktop run tauri:build`) and verify:
   - Settings → Test Mic shows waveform
   - Record / floating widget can start/stop and transcribe

## Risks / Tradeoffs
- Localhost server introduces a local attack surface (port exposure). Mitigations:
  - bind to `127.0.0.1` only
  - serve static assets only
- Fixed port could theoretically conflict; if it becomes an issue, add retry/alternate port logic later.

## Fallbacks
- If localhost serving still fails for WKWebView media capture (unlikely), switch to a native capture path (CoreAudio/AVAudioEngine via Rust) and feed PCM chunks to the existing Soniox transport.
- If WKWebView constraints tighten further, invest in a first-class native audio pipeline while keeping the Tauri shell.

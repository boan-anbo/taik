# iOS Speech + Snippet Prototype — Design

## 1. Project Context

- Long‑term vision: a cross‑platform, highly configurable “input deck” for AI interaction (mobile, desktop, browser, possibly system keyboard later).
- This prototype: a focused **iOS app** using **React Native + small native modules** to validate the core experience and key technical risks.

The prototype deliberately stays small in scope and leaves technical and UX details open where experimentation will be valuable for future iterations.

---

## 2. Prototype Goals

This v0 must demonstrate that:

- **Local speech‑to‑text** is feasible on iOS using a Whisper model:
  - Model is **downloaded once** from a remote source.
  - Transcription runs **fully on device** afterward.
- **React Native (TypeScript)** can:
  - Host the main UI (text area + snippet “deck” + mic control).
  - Orchestrate audio recording, transcription, and text/snippet insertion.
- A simple **“Stream Deck–like” snippet panel** on top of a text area is a natural interaction pattern for composing prompts or other text.
- The architecture leaves a clear path toward:
  - More advanced AI integrations (e.g., prompt templates, multi‑model backends).
  - Deeper OS integration in future phases (custom keyboards, other platforms).

---

## 3. Functional Specification (v0)

### 3.1 Main Screen

Single main screen with:

- **Text area**
  - Central text buffer where:
    - Transcribed speech appears.
    - Snippet text is inserted.
  - Supports basic text editing.
- **Snippet panel**
  - A row or grid of buttons (e.g., 3–8 for v0).
  - Each button represents a **snippet** (label + text payload).
  - Tapping a snippet inserts its text into the main text area.
- **Microphone button**
  - Controls the recording → transcription flow:
    - First tap: start recording.
    - Second tap: stop recording, then trigger transcription.

Exact layout (e.g., top/bottom placement, styling) is flexible and can be refined by the implementation team.

### 3.2 Speech Input Flow

- User taps the **mic button**:
  - If not currently recording: start recording audio.
  - If currently recording: stop recording, finalize audio file.
- After recording stops:
  - The app invokes **local Whisper** to transcribe the audio.
  - When transcription completes, the resulting text is inserted into the text area.
- For v0:
  - **No streaming / live transcription is required**.
  - The “record → stop → transcribe → insert” model is sufficient.

### 3.3 Snippets

- Each snippet:
  - Has a **label** (for the button) and **text** (the content to insert).
- v0 behavior:
  - Can ship with a static preset list of snippets.
  - Optionally: a simple in‑app editor (create, edit, delete) if time allows.
- On tap:
  - The snippet’s text is inserted into the main text area.
  - Exact behavior (append vs insert at cursor vs replace) can be chosen by implementers; v0 just needs one consistent strategy.

### 3.4 Model Management

- On first use:
  - The app checks whether a Whisper model is already available locally.
  - If not, it prompts the user to download a model (e.g., a small “tiny” or “base” model).
  - A progress UI is displayed during download.
- After download:
  - The model is stored in a local app directory.
  - All subsequent transcriptions use this local model; **no further network calls are required for speech‑to‑text**.
- The design keeps open:
  - Using different model sizes.
  - Switching models or clearing them in future versions.

---

## 4. Technical Approach (High‑Level, with Flexibility)

### 4.1 Overall Stack

- **UI & App Logic:** React Native + TypeScript.
- **Native iOS Layer:** Swift (or Objective‑C if preferred) for:
  - Audio recording.
  - Whisper integration.
  - Model download & file management.
- RN tooling:
  - Plain React Native CLI or Expo are both acceptable, as long as:
    - Native modules for audio + Whisper + downloads can be integrated cleanly.

### 4.2 Responsibilities — React Native (JS/TS)

React Native is responsible for:

- **Screen layout and UX**
  - Main text area.
  - Snippet panel / buttons.
  - Microphone button and visual states (idle / recording / transcribing / downloading).
- **State management**
  - Current text content.
  - Cursor position (if needed).
  - Snippet list.
  - Simple UI flags (e.g., `isRecording`, `isTranscribing`, `isDownloadingModel`).
- **Persistence**
  - Snippets and basic settings via any suitable RN storage:
    - Examples: AsyncStorage, MMKV, or similar.
  - Choice is left to implementers, as long as the API is stable from JS.
- **Model manager (JS‑level)**
  - Asks native code whether a model exists and where it is.
  - Triggers model download if needed.
  - Observes download progress (e.g., via events or callbacks).
  - Holds the current “model info” token for use when calling transcription.

Implementation detail (frameworks, storage library) is intentionally left flexible to allow the team to choose familiar tools.

### 4.3 Responsibilities — iOS Native (Swift)

The iOS native layer provides:

- **Audio recording**
  - Start/stop recording upon JS requests.
  - Save audio to a file format Whisper can consume.
  - Return a file path or other handle to JS when recording finishes.
- **Whisper integration**
  - Load or prepare a local model from disk.
  - Run transcription on the recorded audio file.
  - Return the resulting text to JS as an async operation.
  - Internal implementation options (left open):
    - A Core ML‑based Whisper library.
    - `whisper.cpp` compiled as an iOS static library.
    - Another iOS‑friendly Whisper wrapper.
- **Model download & storage**
  - Given a model URL or identifier from JS:
    - Download the model.
    - Store it under an appropriate app directory (e.g., Application Support).
  - Report progress and completion to JS.
  - Provide JS with the model’s local path or identifier for later use.

Exact libraries and patterns (e.g., URLSession, background downloads) are left to the implementation team, as long as the external interface to JS is stable.

### 4.4 JS ↔ Native Interfaces (Conceptual)

From JS/TS, we expect a small set of clear async APIs. Exact names, types, and error handling strategies are flexible, but conceptually there should be functions like:

- **Audio APIs**
  - `startRecording(): Promise<void>` (or a fire‑and‑forget call).
  - `stopRecording(): Promise<{ audioFilePath: string }>`
- **Transcription API**
  - `transcribe(params: { audioFilePath: string; modelPath: string; language?: string; }): Promise<{ text: string }>`
- **Model APIs**
  - `ensureModelAvailable(): Promise<{ modelPath: string }>`
    - Internally checks existence; if missing, triggers download.
  - Or a more explicit pair:
    - `getModelStatus(): Promise<{ exists: boolean; modelPath?: string }>`
    - `downloadModel(): Promise<DownloadResult>` plus progress events.

Design notes:

- Whether these are exposed via:
  - `NativeModules.*`
  - a dedicated JS wrapper module
  - event emitters vs pure Promises
  is left to implementers, as long as the usage from TS remains simple and consistent.

---

## 5. Non‑Functional Expectations

### 5.1 Privacy & On‑Device Processing

- After the model is downloaded:
  - Speech‑to‑text runs entirely on the device.
  - User audio does not need to be uploaded for transcription in this prototype.
- Network usage:
  - Required for model download.
  - Optional for telemetry/diagnostics (if used).

### 5.2 Performance

- Target:
  - “Acceptable” turnaround time on a reasonably modern iPhone using a small model.
  - Exact latency targets can be refined after initial measurements.
- First‑time cost:
  - Model loading and warm‑up may be slower on first run; this is acceptable.
  - The prototype’s goal is to **discover** realistic performance characteristics, not to fully optimize them yet.

### 5.3 UX Quality

- Interaction should feel simple and clear:
  - Open app → tap mic → speak → get text → tap snippets to enhance.
- Error handling:
  - Basic but explicit feedback for:
    - Model download failures.
    - Transcription errors.
    - Missing microphone permission.
  - Simple dialogs or banners are sufficient for v0.

---

## 6. Roadmap & Rationale

### 6.1 Why This Prototype

This prototype is chosen because it:

- Targets the **highest technical risk** early:
  - On‑device Whisper on iOS, coordinated from a TypeScript‑centric stack.
- Validates that **React Native + minimal native code** is a solid foundation for:
  - Future multi‑platform development.
  - More advanced AI workflows.
- Tests the **core UX pattern**:
  - “Speech + snippets → text buffer” as a building block for AI interaction.
- Produces **reusable components**:
  - Model download and management pattern.
  - Audio recording + transcription pipeline.
  - A snippet / “input deck” abstraction.

### 6.2 Relation to Longer‑Term Vision

Once this prototype is working, it can evolve into:

- **Android app**:
  - Reuse React Native logic and adapt the native modules to Android audio + Whisper.
- **Desktop & browser surfaces**:
  - Reuse TypeScript logic for snippets and AI interaction.
  - Implement platform‑specific shells (e.g., Tauri/Electron, browser extensions).
- **Deeper OS integration**:
  - On iOS/Android: custom keyboards / IMEs that tap into the same core concepts.
  - On desktop: global shortcuts, overlays, or “input decks” attached to any app.

The v0 design intentionally leaves room for implementation details and local decisions, while providing clear boundaries for responsibilities, data flow, and future extensibility.

---

## 7. Multi‑Platform Architecture (Consolidated)

This section consolidates team guidance for expanding beyond the iOS prototype to:

- **Mobile:** iOS + Android
- **Desktop:** Tauri
- **Web:** Browser app
- **Browser surface:** Chrome Extension (MV3)

### 7.1 Principle: “Two Renderers + Shared Domain”

To avoid maintaining 4 separate product implementations, default to:

- **Two renderers**
  - **React DOM** for Web + Chrome Extension UI + Tauri UI
  - **React Native** for iOS + Android UI
- **One shared domain layer (TypeScript)**
  - Business logic, state machines, validation, error taxonomy, analytics schema, API clients
  - No direct platform APIs in the domain layer

Outcome: most features are implemented once (domain), then rendered twice (DOM/RN), with platform‑specific capability bridges as needed.

### 7.2 Repo Structure (Target State)

This repo is a monorepo; the target structure is:

- `apps/mobile` (React Native / Expo dev client, iOS + Android)
- `apps/web` (React DOM)
- `apps/desktop` (Tauri shell that packages `apps/web`)
- `apps/extension` (Chrome Extension MV3: popup/options + worker/content scripts)
- `packages/domain` (pure TS domain logic)
- `packages/api` (pure TS API clients + types)
- `packages/ui-tokens` (design tokens: color/spacing/typography/motion)
- `packages/ui-web` (DOM component library)
- `packages/ui-rn` (RN component library)
- `packages/platform-interfaces` (TypeScript interface contracts for platform capabilities)
- `packages/platform-web` / `packages/platform-extension` / `packages/platform-tauri` / `packages/platform-mobile` (platform adapters)

Notes:
- It’s OK to start by extracting only what hurts (e.g., domain + tokens), and add the rest incrementally.
- Existing packages (e.g., `packages/speech-engine`) can evolve into (or depend on) `packages/domain`/`packages/api`.

### 7.3 Platform Boundary: “Capability Adapters”

All platform‑specific behavior must be accessed via interfaces (not directly from feature logic).

Examples of capability interfaces:

- `Storage` (kv/secure/sql)
- `FileSystem` (pick/open/save/read/write/stat)
- `Clipboard`
- `Notifications`
- `Permissions` (camera/mic/files/notifications)
- `Media` (audio capture/playback)
- `Updater` (desktop)
- `Tray/Menu/Shortcuts` (desktop)
- `Extension APIs` (tabs, messaging, host permissions)

Rule: feature code calls `platform.*` (interfaces). Each app wires the correct adapter implementation at boot.

### 7.4 “Native by Exception” (When to build native modules/controls)

Default: implement UI and feature flow in RN/React.

Invest in native modules/controls only when the ROI is clearly high:

- Performance‑critical UI (very large lists, complex animations, heavy gestures)
- Rich text / advanced editing
- Audio/video capture & playback
- Background tasks, low‑power constraints
- Deep OS integration (system share, CallKit‑like features, etc.)

In practice, this often means: RN/React provides the screen and orchestration, while a native module provides a focused capability.

### 7.5 Tauri (Desktop) Guidelines

Tauri should be treated as a secure desktop shell around the web UI:

- **UI:** reuse `apps/web` artifacts (same routes/components/tokens)
- **Security defaults**
  - Restrict navigation to local content (no arbitrary external URL navigation)
  - Strict CSP (only what’s needed)
  - Prefer a small, explicit command surface (white‑list only)
- **IPC discipline**
  - Validate all command inputs (schema validation)
  - Keep “dangerous” capabilities behind explicit user actions (open/save dialogs)
- **System capabilities via plugins**
  - File dialogs + filesystem access
  - Tray/menu/global shortcuts
  - Auto‑update (signed, verified, reversible)

### 7.6 Chrome Extension (MV3) Guidelines

The extension has distinct execution environments; design for separation:

- UI pages (popup/options) should reuse DOM components and shared domain logic.
- Service worker and content scripts should stay thin and communicate via a typed message protocol.
- Permissions must be centrally reviewed and minimized (host permissions in particular).
- Storage must go through the `Storage` interface (implementation maps to `chrome.storage` / IndexedDB).

### 7.7 Decision Process: ADRs

Any decision that increases long‑term maintenance cost (e.g., “build a native control”, “introduce new platform capability”, “split a package”) should include a short ADR.

**ADR template (copy/paste):**

```md
# ADR-XXXX: <Decision Title>

## Status
Proposed | Accepted | Rejected | Superseded

## Context
What problem are we solving? Which platforms are affected?

## Options
1) Option A
2) Option B
3) Do nothing

## Decision
What we chose and why (include measurable criteria).

## Consequences
Cost, complexity, risks, ownership.

## Rollback Plan
How to revert (feature flag, migration, fallback).
```

### 7.8 Quality Gates (Recommended)

- Shared domain packages have unit tests for key flows and error handling.
- Web/Tauri have at least smoke e2e coverage for critical user journeys.
- Mobile has at least one e2e path for the critical flow (and avoids coordinate taps).
- Analytics events are validated against a shared schema (compile-time + runtime guard).

### 7.9 UI Reuse + Storybook Workflow

#### Storybook support

Storybook can be used in two complementary ways:

- **DOM Storybook (recommended as the primary iteration loop):**
  - Runs in the browser, fastest for UI iteration.
  - Can host:
    - `ui-web` components directly.
    - **Optionally** `ui-rn` components rendered through `react-native-web` (RN primitives → DOM), so mobile UI primitives can be iterated in a browser.
- **RN Storybook (optional, for device-only behaviors):**
  - Runs inside the RN app (dev client) and is useful for verifying:
    - gestures, keyboard, safe areas, device fonts, platform quirks
  - Should be gated behind a dev flag so it’s not shipped to production builds.

#### What is reusable between React DOM and React Native

React DOM and React Native have different rendering primitives (`div`/CSS vs `View`/style objects), so *pixel-level UI* is not automatically shared. The reuse strategy is layered:

1) **Always shared**
   - Design tokens (`packages/ui-tokens`)
   - Domain logic + hooks (pure TS)
   - Accessibility, copy, analytics events, validation

2) **Often shared (recommended)**
   - “Headless” components: behavior and state without rendering (e.g., input validation, async states, list selection logic)
   - Export a stable component API (props/types) that both renderers implement.

3) **Sometimes shared (when it fits)**
   - Core presentational primitives implemented once with RN primitives + `react-native-web` for web rendering.
   - This works best for foundational components (Button/Text/Stack/Card) that don’t rely on advanced DOM-only features.

#### Recommended technical design for reuse

Adopt a split with shared contracts:

- `packages/ui-tokens`: tokens + theming contract
- `packages/ui-core`: shared props/types + headless logic + helper hooks
- `packages/ui-web`: DOM renderer implementations (use `ui-core` contracts)
- `packages/ui-rn`: RN renderer implementations (use `ui-core` contracts)

Optional (if we want browser-first iteration for RN primitives):

- `packages/ui-rn-web`: thin adapter exporting `ui-rn` components under a web build (RN primitives via `react-native-web`)

Rule of thumb:
- Product screens can differ per renderer.
- “Design system primitives” should share tokens + API and (where possible) share stories and behavior tests.

#### Story organization (so stories are reusable)

Prefer a story structure where the same “component contract” can be exercised in both renderers:

- Put shared story data/args in `ui-core` (example: default props, edge cases).
- Keep renderer-specific wrappers in `ui-web` and `ui-rn`.

This keeps Storybook a true iteration tool instead of a forked documentation site.

### 7.10 Design System (Tokens, Units, Reuse)

The design system should be implemented as code, not as “a single component library that magically runs everywhere”.

#### Token-first

Standardize “units” as tokens and use them everywhere:

- **Spacing scale** (e.g., 4/8/12/16/20/24/32…)
- **Radii** (8/12/16/999)
- **Typography** (font sizes, weights, line heights)
- **Color roles** (background/surface/text/brand/danger, etc.)

Tokens must be platform-agnostic data (plain JS/TS), and each renderer maps them to its styling system (RN StyleSheet vs CSS variables).

#### Component reuse strategy

1) Shared: tokens + domain + headless UI logic.
2) Renderer-specific: component implementations for DOM and RN that share the same prop contract.
3) Optional: for primitives, allow “RN-first” components rendered on web through `react-native-web` when it is beneficial for iteration speed.

#### In-repo starting point

- Tokens live in `packages/ui-tokens` (simple and safe to import everywhere).
- Storybook is used to iterate on primitives and screen views:
  - RN stories live in `apps/mobile/.rnstorybook/stories`.
  - Prefer “view” components (pure/presentational) for stories; keep side-effects in containers.

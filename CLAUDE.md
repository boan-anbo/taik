# Taik Project

## Skills

### Architecture (Multi‑Platform)

Default design for Taik across **Web + Chrome Extension + Tauri + iOS/Android**:
- Prefer **Two Renderers + Shared Domain**: React DOM (web/extension/tauri UI) + React Native (mobile UI) + shared pure‑TS domain packages.
- Keep platform differences behind **capability adapters** (interfaces + per‑platform implementations); domain/feature logic must not call platform APIs directly.
- Use **Native by Exception**: only build native modules/controls/plugins when there’s clear ROI (audio/video, rich text, background tasks, deep OS integration, perf‑critical UI).
- Tauri: treat as a secure shell (whitelist commands, validate IPC inputs, strict CSP, no arbitrary URL navigation, user‑mediated filesystem access).
- Extension: keep MV3 environments separated (UI vs worker vs content scripts) and use a typed message protocol; minimize permissions.

### UI & Storybook

- Prefer a layered reuse model: `ui-tokens` (shared) + `ui-core` (shared contracts/headless logic) + `ui-web` and `ui-rn` (renderer implementations).
- Storybook workflow: primary iteration via DOM Storybook; optionally render RN primitives in the browser via `react-native-web`, and use in-app RN Storybook only for device-only behaviors.
- RN Storybook in this repo lives in `apps/mobile/.rnstorybook`; enable it with `STORYBOOK_ENABLED=true` and run `npm -w taik-mobile run storybook` (Metro must be wrapped with `@storybook/react-native/metro/withStorybook`).
- Design tokens live in `packages/ui-tokens` (use them instead of hard-coded spacing/colors so DOM/RN can stay consistent).

### iOS Build & Development

When encountering Expo/iOS build issues (CocoaPods errors, xcodebuild failures, build.db locked):
- **Read first**: `.claude/skills/ios-build/SKILL.md`
- Never use Expo Go - always use `npx expo run:ios --device "设备名"`
- If build seems stuck, verify with `ps aux | grep xcodebuild`
  - If you see `build.db` locked, there is usually a leftover `xcodebuild` process; kill it and delete `~/Library/Developer/Xcode/DerivedData/Taik-*` before retrying.
  - If CocoaPods errors mention `objectVersion` (e.g. `70`), check `apps/mobile/ios/Taik.xcodeproj/project.pbxproj` for `objectVersion = ...` compatibility.

### Tauri Desktop Development

When working on Tauri v2 desktop app (permissions, debugging, logs):
- **Read first**: `.claude/skills/tauri-development/SKILL.md`
- Frontend `console.log` outputs to terminal as `[FRONTEND:INFO]`, `[FRONTEND:ERROR]`
- When running Tauri in background, read logs from `/tmp/claude/tasks/{task_id}.output`
- Permission errors (`xxx not allowed`) → fix in `apps/desktop/src-tauri/capabilities/default.json`
- After modifying dependencies, rebuild and clear Vite cache: `rm -rf node_modules/.vite`

### Maestro E2E Testing

When working on Maestro E2E tests (especially iOS Settings automation, selector issues, flaky taps):
- **Read first**: `.claude/skills/maestro-e2e-debugging/SKILL.md`
- Follow the A-H workflow before making changes
- Never use coordinate-based taps (`point: "x,y"`)

## Maestro Flows

- Location: `apps/mobile/.maestro/flows/`
- Reset script: `apps/mobile/.maestro/scripts/reset-keyboard.sh`
- Issue report: `apps/mobile/.maestro/MAESTRO_ISSUES_REPORT.md`

## Tauri Desktop Build

- Location: `apps/desktop/`
- Dev command: `npm run tauri dev`
- Capabilities: `apps/desktop/src-tauri/capabilities/default.json`
- Logs: Terminal output or `/tmp/claude/tasks/{task_id}.output` (when running in background)

## iOS Build

- Workspace: `apps/mobile/ios/Taik.xcworkspace`
- Build command: `npx expo run:ios --device "Taik-E2E-Test"`
- Logs: `/tmp/expo-ios.log`, `~/Library/Developer/Xcode/DerivedData/Taik-*/Logs/`

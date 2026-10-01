# Taik

Voice recording and transcription workspace with shared TypeScript packages,
a Tauri desktop app, React Native mobile app, web experiments, and a native
Swift iOS prototype.

This is a development snapshot, not a tested release. See
[the Air handoff](docs/AIR-HANDOFF.md) before continuing development.

## Start

```sh
npm ci
npm run desktop:dev
```

Desktop development additionally requires Rust and the platform build tools.
Apple development requires Xcode and the appropriate signing configuration.
Configure transcription credentials locally; never commit them. The example
environment file contains placeholders, not working credentials.

## Source layout

- `apps/desktop`: Tauri desktop shell and React UI.
- `apps/mobile`: React Native / Expo mobile client.
- `apps/web`: web and Storybook experiments.
- `apps/ios/Taik`: native Swift prototype, included as regular source files.
- `packages`: capabilities, shared domain, speech engines and UI packages.

## Publication boundary

The public repository begins with a clean current-source snapshot. Older local
Git history is retained privately and is not published because it contained an
embedded credential and an audio fixture of unverified publication status.
Recordings, debug signing material, build products, machine-specific Xcode
state and runtime logs are excluded. Tests requiring the omitted audio fixture
need a locally supplied, non-sensitive file at the documented fixture path.

No license grant has been selected yet.

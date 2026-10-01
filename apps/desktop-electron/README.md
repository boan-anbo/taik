# Taik Desktop (Electron)

## Build

From repo root:
```bash
npm run desktop:build:app
```

Run the built app:
```bash
npm run desktop:run:app
```

## App size

Current macOS arm64 build (dir target):
- `Taik.app` size: ~248M (measured with `du -sh apps/desktop-electron/release/mac-arm64/Taik.app`)

Note: size varies by build configuration and Electron version.

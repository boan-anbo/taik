# Taik E2E Testing

Maestro-based end-to-end testing for the Taik iOS keyboard extension.

## Quick Start

```bash
# 1. Setup test environment (creates dedicated simulator)
./.maestro/scripts/setup-test-env.sh

# 2. Build and install Taik app
npx expo run:ios --device "Taik-E2E-Test"

# 3. Configure keyboard (required once)
~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml

# 4. Run E2E tests
~/.maestro/bin/maestro test .maestro/flows/recording-to-keyboard-e2e.yaml
```

## Architecture

```
.maestro/
├── scripts/
│   ├── setup-test-env.sh      # Create & configure test simulator
│   ├── teardown-test-env.sh   # Cleanup test environment
│   └── reset-keyboard.sh      # Remove Taik keyboard from simulator
├── flows/
│   ├── keyboard-setup.yaml           # Add keyboard + enable Full Access
│   ├── recording.yaml                # Test recording in main app
│   ├── recording-to-keyboard-e2e.yaml # Full E2E: record → insert via keyboard
│   ├── keyboard-recording.yaml       # Test keyboard in external app
│   └── subflows/
│       ├── add-keyboard.yaml         # Reusable: add keyboard to iOS
│       ├── enable-full-access.yaml   # Reusable: enable Full Access
│       └── insert-in-notes.yaml      # Reusable: insert text in Notes/Safari
├── config.yaml
└── README.md
```

## Test Environment

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| macOS | 13+ | Apple Silicon or Intel |
| Xcode | 15+ | With iOS 18.x simulator runtime |
| Maestro | 2.0+ | `curl -Ls "https://get.maestro.mobile.dev" \| bash` |
| Node.js | 18+ | For Expo build |

### Dedicated Test Simulator

E2E tests run on a dedicated simulator (`Taik-E2E-Test`) to ensure:
- Consistent environment across test runs
- Isolation from development simulator
- All system apps (Notes, Safari) available
- Reproducible CI/CD setup

```bash
# Create test simulator
./.maestro/scripts/setup-test-env.sh

# Reset test simulator (fresh state)
./.maestro/scripts/setup-test-env.sh --reset

# Shutdown test simulator
./.maestro/scripts/teardown-test-env.sh

# Delete test simulator
./.maestro/scripts/teardown-test-env.sh --delete
```

## Test Flows

### 1. Keyboard Setup (`keyboard-setup.yaml`)

**Purpose**: Configure Taik keyboard in iOS Settings

**What it does**:
1. Opens Settings → General → Keyboard → Keyboards
2. Adds TaikKeyboard if not present
3. Enables "Allow Full Access"
4. Returns to Settings root

**Run**:
```bash
~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml
```

**Idempotent**: Yes - safe to run multiple times

---

### 2. Recording E2E (`recording-to-keyboard-e2e.yaml`)

**Purpose**: Test full voice-to-text insertion flow

**What it does**:
1. Records voice in Taik app (via Soniox API)
2. Taps "Insert via Keyboard"
3. Switches to Safari (or Notes)
4. Opens Taik keyboard
5. Waits for auto-insertion
6. Returns to Taik app

**Run**:
```bash
~/.maestro/bin/maestro test .maestro/flows/recording-to-keyboard-e2e.yaml
```

**Prerequisites**:
- Keyboard setup completed
- Microphone permission granted
- Network access (Soniox API)

---

### 3. Recording Only (`recording.yaml`)

**Purpose**: Test recording flow in main app only

**What it does**:
1. Launches Taik app
2. Starts/stops recording
3. Verifies transcript appears
4. Tests copy/insert buttons

---

### 4. Keyboard in App (`keyboard-recording.yaml`)

**Purpose**: Test keyboard functionality in external app

**What it does**:
1. Opens Notes/Safari
2. Switches to Taik keyboard
3. Tests deck toggle, mic button, deck buttons

## Debugging

### Interactive Mode

```bash
# Step through commands interactively
~/.maestro/bin/maestro studio
```

### View UI Hierarchy

```bash
# Export current screen's element tree
~/.maestro/bin/maestro hierarchy
```

### Debug Output

Test artifacts are saved to `~/.maestro/tests/<timestamp>/`:
- `maestro.log` - Detailed execution log
- `screenshot-*.png` - Failure screenshots
- `commands-*.json` - Command execution details

### Common Issues

| Issue | Solution |
|-------|----------|
| "Allow Full Access" switch not responding | Use `rightOf` selector (see `enable-full-access.yaml`) |
| Notes app not available | Use Safari instead, or reset simulator |
| Keyboard not appearing | Run `keyboard-setup.yaml` first |
| Soniox API timeout | Check network, extend timeout to 60s |

## CI/CD Integration

### GitHub Actions Example

```yaml
jobs:
  e2e-test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4

      - name: Setup Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Setup Test Environment
        run: ./.maestro/scripts/setup-test-env.sh

      - name: Build Taik
        run: npx expo run:ios --device "Taik-E2E-Test" --no-install

      - name: Run E2E Tests
        run: |
          ~/.maestro/bin/maestro test .maestro/flows/keyboard-setup.yaml
          ~/.maestro/bin/maestro test .maestro/flows/recording-to-keyboard-e2e.yaml

      - name: Upload Artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-logs
          path: ~/.maestro/tests/
```

## Skill Reference

For debugging Maestro E2E issues, see:
- `.claude/skills/maestro-e2e-debugging/SKILL.md`

Key patterns:
- Use `rightOf`/`leftOf` for iOS Settings switches
- Use `extendedWaitUntil` for async operations
- Create minimal `debug-*.yaml` flows to isolate issues

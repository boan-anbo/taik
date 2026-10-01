# Taik Design System

A cross-platform design system supporting React Native and React DOM with shared type contracts and design tokens.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Applications                              │
├─────────────────────────────────────────────────────────────────┤
│  apps/mobile (Expo)          │  apps/web (Vite)                 │
│  └─ uses @taik/ui-rn         │  └─ uses @taik/ui-web            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      UI Implementations                          │
├─────────────────────────────────────────────────────────────────┤
│  @taik/ui-rn                 │  @taik/ui-web                    │
│  └─ React Native primitives  │  └─ HTML/CSS primitives          │
│     (View, Pressable, etc.)  │     (div, button, etc.)          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Shared Foundation                           │
├──────────────────────────────┬──────────────────────────────────┤
│  @taik/ui-core               │  @taik/ui-tokens                 │
│  └─ TypeScript interfaces    │  └─ Design tokens (colors,       │
│     (ButtonProps, TextProps) │     spacing, typography)         │
└──────────────────────────────┴──────────────────────────────────┘
```

## Packages

| Package | Description | Dependencies |
|---------|-------------|--------------|
| [`@taik/ui-tokens`](./ui-tokens/) | Design tokens (colors, spacing, typography) | None |
| [`@taik/ui-core`](./ui-core/) | TypeScript type contracts | React (peer) |
| [`@taik/ui-rn`](./ui-rn/) | React Native component implementations | ui-core, ui-tokens |
| [`@taik/ui-web`](./ui-web/) | React DOM component implementations | ui-core, ui-tokens |

## Key Principles

### 1. Token-First Design

All visual values are centralized in `@taik/ui-tokens`. No magic numbers in components.

```typescript
import { tokens } from '@taik/ui-tokens';

// Colors
tokens.color.brand      // #007AFF
tokens.color.danger     // #FF3B30

// Spacing
tokens.space.lg         // 16
tokens.space.xl         // 20

// Typography
tokens.fontSize.md      // 15
tokens.fontWeight.semibold  // '600'
```

### 2. Shared Type Contracts

Component props are defined once in `@taik/ui-core` and implemented by both renderers.

```typescript
// @taik/ui-core
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  children: React.ReactNode;
}

// Both ui-rn and ui-web implement this exact interface
```

### 3. Container/View Pattern

Screens are split into Container (logic) and View (presentation) components.

```
RecordingScreen.tsx     → Container: hooks, state, side effects
RecordingScreenView.tsx → View: pure presentation, Storybook-friendly
```

### 4. Two Renderers, One Contract

The same component API works across platforms:

```typescript
// React Native (apps/mobile)
import { Button } from '@taik/ui-rn';

// React DOM (apps/web)
import { Button } from '@taik/ui-web';

// Same props, same behavior, different rendering
<Button variant="primary" onPress={handleClick}>
  Save
</Button>
```

## Components

### Core Components

| Component | Description | ui-rn | ui-web |
|-----------|-------------|-------|--------|
| Button | Pressable button with variants | ✅ | ✅ |
| Text | Typography with semantic variants | ✅ | ✅ |
| Input | Text input with label/help text | ✅ | ✅ |
| Card | Container with optional press | ✅ | ✅ |
| Modal | Modal overlay container | ✅ | ✅ |
| ModalHeader | Modal title bar with actions | ✅ | ✅ |
| ListRow | iOS Settings-style row | ✅ | ✅ |
| Section | Grouped content with title | ✅ | ✅ |

### Modal Components (ui-rn only)

| Component | Description |
|-----------|-------------|
| ApiKeyEditor | Text input modal for API keys |
| LanguageSelector | Multi-select language picker |
| ButtonEditor | Deck button configuration editor |

## Storybook

### DOM Storybook (Browser)

```bash
cd apps/web
npm run storybook
# Opens http://localhost:6006
```

### RN Storybook (On-Device)

```bash
cd apps/mobile
npm run storybook
# Then open app on device/simulator
```

## Quick Start

### Using a Component

```typescript
// In a React Native app
import { Button, Text, Card } from '@taik/ui-rn';
import { tokens } from '@taik/ui-tokens';

function MyComponent() {
  return (
    <Card>
      <Text variant="title">Welcome</Text>
      <Button variant="primary" onPress={() => {}}>
        Get Started
      </Button>
    </Card>
  );
}
```

### Creating a New Component

1. **Define types in ui-core:**
```typescript
// packages/ui-core/src/types/components.ts
export interface BadgeProps extends BaseComponentProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}
```

2. **Implement in ui-rn:**
```typescript
// packages/ui-rn/src/components/Badge.tsx
import type { BadgeProps } from '@taik/ui-core';
import { tokens } from '@taik/ui-tokens';

export function Badge({ variant = 'info', children }: BadgeProps) {
  // React Native implementation
}
```

3. **Implement in ui-web:**
```typescript
// packages/ui-web/src/components/Badge.tsx
import type { BadgeProps } from '@taik/ui-core';
import { tokens } from '@taik/ui-tokens';

export function Badge({ variant = 'info', children }: BadgeProps) {
  // DOM implementation
}
```

4. **Export from both packages:**
```typescript
// packages/ui-rn/src/index.ts
export { Badge } from './components/Badge';

// packages/ui-web/src/index.ts
export { Badge } from './components/Badge';
```

5. **Add stories for both Storybooks**

## Type Safety

The design system uses discriminated unions for complex types:

```typescript
// ButtonAction is a discriminated union
type ButtonAction =
  | { type: 'insertText'; text: string }
  | { type: 'startCapture' }
  | { type: 'openApp'; path?: string };

// Type-safe usage
function handleAction(action: ButtonAction) {
  switch (action.type) {
    case 'insertText':
      insertText(action.text); // TypeScript knows text exists
      break;
    case 'startCapture':
      startRecording();
      break;
    case 'openApp':
      openApp(action.path); // TypeScript knows path is optional
      break;
  }
}
```

## Directory Structure

```
packages/
├── ui-tokens/          # Design tokens
│   ├── index.js        # Token definitions
│   └── index.d.ts      # TypeScript declarations
│
├── ui-core/            # Type contracts
│   └── src/
│       └── types/
│           ├── components.ts  # Component prop types
│           ├── modals.ts      # Modal-specific types
│           ├── screens.ts     # Screen view prop types
│           └── index.ts       # Barrel exports
│
├── ui-rn/              # React Native implementations
│   └── src/
│       ├── components/   # Core components
│       ├── modals/       # Modal components
│       └── index.ts      # Package exports
│
└── ui-web/             # DOM implementations
    └── src/
        ├── components/   # Core components
        └── index.ts      # Package exports
```

## Related Documentation

- [DESIGN_SYSTEM_EXECUTION.md](/DESIGN_SYSTEM_EXECUTION.md) - Implementation roadmap
- [design.md](/design.md) - Multi-platform architecture guidelines

# @taik/ui-tokens

Design tokens for the Taik Design System. A single source of truth for colors, spacing, typography, and other visual constants.

## Installation

```bash
npm install @taik/ui-tokens
```

## Usage

```typescript
import { tokens } from '@taik/ui-tokens';

// Colors
const primaryColor = tokens.color.brand;       // #007AFF
const errorColor = tokens.color.danger;        // #DC2626

// Spacing
const padding = tokens.space.lg;               // 16
const gap = tokens.space.md;                   // 12

// Typography
const bodySize = tokens.fontSize.md;           // 15
const boldWeight = tokens.fontWeight.bold;     // '700'

// Border radius
const cardRadius = tokens.radius.md;           // 12
```

## Token Reference

### Colors

#### Core Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.background` | `#FFFFFF` | Page background |
| `color.surface` | `#F5F5F5` | Card/surface background |
| `color.surfaceAlt` | `#F0F8FF` | Alternate surface (subtle blue tint) |
| `color.borderSubtle` | `#E0E8F0` | Light borders |
| `color.text` | `#333333` | Primary text |
| `color.textSubtle` | `#666666` | Secondary text |
| `color.brand` | `#007AFF` | Primary brand color (iOS blue) |
| `color.danger` | `#DC2626` | Error/destructive actions |
| `color.dangerSurface` | `#FEE2E2` | Error background |

#### State Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.recording` | `#FF3B30` | Active recording indicator |
| `color.processing` | `#FF9500` | Processing/loading state |
| `color.success` | `#34C759` | Success states |
| `color.warning` | `#FF9500` | Warning states |

#### iOS System Grays

For Settings-style UI components:

| Token | Value |
|-------|-------|
| `color.systemGray` | `#8E8E93` |
| `color.systemGray2` | `#AEAEB2` |
| `color.systemGray3` | `#C7C7CC` |
| `color.systemGray4` | `#D1D1D6` |
| `color.systemGray5` | `#E5E5EA` |
| `color.systemGray6` | `#F2F2F7` |

#### Semantic Aliases

| Token | Value | Usage |
|-------|-------|-------|
| `color.secondaryLabel` | `#8E8E93` | Secondary label text |
| `color.tertiaryLabel` | `#C7C7CC` | Tertiary/disabled text |
| `color.separator` | `#E5E5EA` | List separators |
| `color.groupedBackground` | `#F2F2F7` | Grouped table background |
| `color.secondaryGroupedBackground` | `#FFFFFF` | Grouped table cell background |
| `color.black` | `#000000` | Pure black |
| `color.white` | `#FFFFFF` | Pure white |

### Spacing

| Token | Value (px) | Usage |
|-------|------------|-------|
| `space.xs` | 4 | Minimal spacing |
| `space.sm` | 8 | Small gaps |
| `space.md` | 12 | Medium gaps |
| `space.lg` | 16 | Standard padding |
| `space.xl` | 20 | Large gaps |
| `space.xxl` | 24 | Section spacing |
| `space.xxxl` | 32 | Major section breaks |
| `space.screenPadding` | 20 | Screen edge padding |

### Border Radius

| Token | Value (px) | Usage |
|-------|------------|-------|
| `radius.sm` | 8 | Small buttons, chips |
| `radius.md` | 12 | Cards, inputs |
| `radius.lg` | 16 | Large cards, modals |
| `radius.pill` | 999 | Pill buttons, badges |

### Typography

#### Font Sizes

| Token | Value (px) | Usage |
|-------|------------|-------|
| `fontSize.xs` | 13 | Captions, footnotes |
| `fontSize.sm` | 14 | Secondary text |
| `fontSize.md` | 15 | Body text |
| `fontSize.lg` | 16 | Emphasized text |
| `fontSize.xl` | 17 | Titles |
| `fontSize.title` | 20 | Screen titles |

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `fontWeight.medium` | `'500'` | Slightly emphasized |
| `fontWeight.semibold` | `'600'` | Labels, buttons |
| `fontWeight.bold` | `'700'` | Strong emphasis |
| `fontWeight.heavy` | `'900'` | Maximum emphasis |

#### Line Heights

| Token | Value (px) |
|-------|------------|
| `lineHeight.body` | 24 |

## Usage Examples

### React Native (StyleSheet)

```typescript
import { StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderRadius: tokens.radius.md,
    padding: tokens.space.lg,
    shadowColor: tokens.color.black,
    shadowOpacity: 0.05,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.color.secondaryLabel,
  },
});
```

### React DOM (CSS-in-JS)

```typescript
import { tokens } from '@taik/ui-tokens';

const styles = {
  card: {
    backgroundColor: tokens.color.secondaryGroupedBackground,
    borderRadius: `${tokens.radius.md}px`,
    padding: `${tokens.space.lg}px`,
    boxShadow: `0 1px 3px ${tokens.color.black}0d`,
  } as React.CSSProperties,
};
```

### Conditional Styling

```typescript
import { tokens } from '@taik/ui-tokens';

function getStateColor(state: 'idle' | 'recording' | 'processing') {
  switch (state) {
    case 'recording':
      return tokens.color.recording;
    case 'processing':
      return tokens.color.processing;
    default:
      return tokens.color.brand;
  }
}
```

## Design Principles

### iOS-First Design

The token system follows iOS Human Interface Guidelines with system grays and semantic colors that match iOS defaults.

### No Magic Numbers

Every visual value should come from tokens:

```typescript
// Good
padding: tokens.space.lg,
borderRadius: tokens.radius.md,

// Bad
padding: 16,
borderRadius: 12,
```

### Semantic Naming

Use semantic aliases when available:

```typescript
// Preferred (semantic)
color: tokens.color.secondaryLabel,

// Also valid (but less semantic)
color: tokens.color.systemGray,
```

## TypeScript Support

Full TypeScript support via `index.d.ts`:

```typescript
import { tokens } from '@taik/ui-tokens';

// Type-safe access
const color: string = tokens.color.brand;
const space: number = tokens.space.lg;
const weight: string = tokens.fontWeight.bold;
```

## Adding New Tokens

1. Add the token to `index.js`
2. Add the type declaration to `index.d.ts`
3. Document in this README
4. Update consumers as needed

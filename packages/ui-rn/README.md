# @taik/ui-rn

React Native implementation of the Taik Design System. Built on React Native primitives with full token and type support.

## Installation

```bash
npm install @taik/ui-rn @taik/ui-core @taik/ui-tokens
```

### Peer Dependencies

```json
{
  "react": "^18.0.0",
  "react-native": "^0.72.0"
}
```

## Usage

```typescript
import { Button, Text, Input, Card, Modal, ListRow, Section } from '@taik/ui-rn';

function MyScreen() {
  return (
    <Card>
      <Text variant="title">Welcome</Text>
      <Text variant="body">Get started with Taik</Text>
      <Button variant="primary" onPress={() => {}}>
        Continue
      </Button>
    </Card>
  );
}
```

## Components

### Button

Pressable button with variants and sizes.

```typescript
import { Button } from '@taik/ui-rn';

// Variants
<Button variant="primary" onPress={() => {}}>Primary</Button>
<Button variant="secondary" onPress={() => {}}>Secondary</Button>
<Button variant="tertiary" onPress={() => {}}>Tertiary</Button>
<Button variant="danger" onPress={() => {}}>Delete</Button>

// Sizes
<Button size="sm" onPress={() => {}}>Small</Button>
<Button size="md" onPress={() => {}}>Medium</Button>
<Button size="lg" onPress={() => {}}>Large</Button>

// States
<Button loading onPress={() => {}}>Loading...</Button>
<Button disabled onPress={() => {}}>Disabled</Button>
<Button fullWidth onPress={() => {}}>Full Width</Button>
```

### Text

Typography component with semantic variants.

```typescript
import { Text } from '@taik/ui-rn';

// Variants
<Text variant="heading">Page Heading</Text>
<Text variant="title">Section Title</Text>
<Text variant="body">Body text content</Text>
<Text variant="caption">Caption text</Text>
<Text variant="label">Form Label</Text>

// Customization
<Text weight="bold">Bold text</Text>
<Text color={tokens.color.brand}>Colored text</Text>
<Text align="center">Centered text</Text>
<Text numberOfLines={2}>Truncated text...</Text>
```

### Input

Text input with label and help text.

```typescript
import { Input } from '@taik/ui-rn';

// Basic
<Input
  value={text}
  onChangeText={setText}
  placeholder="Enter text"
/>

// With label and help
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  helpText="We'll never share your email"
/>

// Multiline
<Input
  multiline
  numberOfLines={4}
  value={notes}
  onChangeText={setNotes}
  placeholder="Enter notes..."
/>

// Password
<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
/>
```

### Card

Container component with optional press handling.

```typescript
import { Card } from '@taik/ui-rn';

// Basic card
<Card>
  <Text>Card content</Text>
</Card>

// Pressable card
<Card onPress={() => navigation.navigate('Details')}>
  <Text>Tap to view details</Text>
</Card>

// Elevated card
<Card elevated>
  <Text>Card with shadow</Text>
</Card>

// Padding options
<Card padding="none">No padding</Card>
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="lg">Large padding</Card>
```

### Modal

Modal overlay container.

```typescript
import { Modal } from '@taik/ui-rn';

<Modal
  visible={showModal}
  onRequestClose={() => setShowModal(false)}
  title="Modal Title"
  animationType="slide"
  presentationStyle="pageSheet"
>
  <Text>Modal content</Text>
</Modal>
```

### ModalHeader

Header bar for modals with cancel/save actions.

```typescript
import { ModalHeader } from '@taik/ui-rn';

<ModalHeader
  title="Edit Profile"
  onCancel={() => setShowModal(false)}
  onSave={handleSave}
  saveLabel="Done"
  saveDisabled={!isValid}
/>
```

### ListRow

iOS Settings-style list row.

```typescript
import { ListRow } from '@taik/ui-rn';

// Basic row
<ListRow title="Setting Name" />

// With subtitle
<ListRow
  title="Account"
  subtitle="john@example.com"
  onPress={() => {}}
  showChevron
/>

// With value
<ListRow
  title="Language"
  value="English"
  onPress={() => {}}
  showChevron
/>

// With custom accessory
<ListRow
  title="Notifications"
  accessoryRight={<Switch value={enabled} onValueChange={setEnabled} />}
/>
```

### Section

Grouped content with title and footer.

```typescript
import { Section, ListRow, Card } from '@taik/ui-rn';

<Section title="ACCOUNT" footer="Your account information">
  <Card>
    <ListRow title="Email" value="john@example.com" />
    <ListRow title="Password" value="••••••••" showTopBorder showChevron />
  </Card>
</Section>
```

## Modal Components

Pre-built modal screens for common use cases.

### ApiKeyEditor

Text input modal for API keys.

```typescript
import { ApiKeyEditor } from '@taik/ui-rn';

<ApiKeyEditor
  currentKey={apiKey}
  onSave={(key) => {
    setApiKey(key);
    setShowModal(false);
  }}
  onCancel={() => setShowModal(false)}
  title="API Key"
  placeholder="Enter your API key"
  helpText="Get your key from the dashboard"
/>
```

### LanguageSelector

Multi-select language picker.

```typescript
import { LanguageSelector } from '@taik/ui-rn';

<LanguageSelector
  currentLanguages={['en']}
  availableLanguages={[
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
  ]}
  onSave={(languages) => {
    setLanguages(languages);
    setShowModal(false);
  }}
  onCancel={() => setShowModal(false)}
  allowMultiple
  helpText="Select languages for recognition"
/>
```

### ButtonEditor

Deck button configuration editor.

```typescript
import { ButtonEditor } from '@taik/ui-rn';
import type { DeckButton } from '@taik/ui-core';

<ButtonEditor
  button={editingButton}
  isNew={false}
  onSave={(button: DeckButton) => {
    saveButton(button);
    setShowModal(false);
  }}
  onDelete={(id) => {
    deleteButton(id);
    setShowModal(false);
  }}
  onCancel={() => setShowModal(false)}
/>
```

## Type Exports

Types are re-exported from `@taik/ui-core` for convenience:

```typescript
import type {
  ButtonProps,
  TextProps,
  InputProps,
  CardProps,
  ModalProps,
  ModalHeaderProps,
  ListRowProps,
  SectionProps,
  ApiKeyEditorProps,
  LanguageSelectorProps,
  ButtonEditorProps,
} from '@taik/ui-rn';
```

## Storybook

View components in the on-device Storybook:

```bash
cd apps/mobile
npm run storybook
# Then open app on device/simulator
```

## Implementation Details

### Primitives Used

| Component | React Native Primitives |
|-----------|------------------------|
| Button | `Pressable`, `ActivityIndicator` |
| Text | `Text` |
| Input | `View`, `Text`, `TextInput` |
| Card | `View`, `Pressable` |
| Modal | `Modal`, `SafeAreaView` |
| ModalHeader | `View`, `Pressable`, `Text` |
| ListRow | `View`, `Pressable`, `Text` |
| Section | `View`, `Text` |

### Styling Approach

All components use `StyleSheet.create()` with tokens from `@taik/ui-tokens`:

```typescript
import { StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';

const styles = StyleSheet.create({
  container: {
    padding: tokens.space.lg,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
  },
});
```

### Accessibility

All components support:
- `testID` for E2E testing
- `aria-label` for screen readers
- `disabled` state handling

import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';
import { fn } from 'storybook/test';

import { RecordingScreenView } from '../../src/screens/RecordingScreenView';

const meta = {
  title: 'Taik/Screens/Recording',
  component: RecordingScreenView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    state: 'idle',
    partialText: '',
    finalText: '',
    error: null,
    onMicPress: fn(),
    onDismissError: fn(),
    onSendToKeyboard: fn(),
    onCopyToClipboard: fn(),
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'starting', 'recording', 'stopping', 'completed', 'error'],
    },
  },
} satisfies Meta<typeof RecordingScreenView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Recording: Story = {
  args: {
    state: 'recording',
    partialText: 'Hello from Taik…',
    finalText: '',
  },
};

export const Completed: Story = {
  args: {
    state: 'completed',
    finalText: 'Hello from Taik. This is the final transcript.',
  },
};

export const ErrorState: Story = {
  args: {
    state: 'error',
    error: 'Microphone permission is missing.',
  },
};


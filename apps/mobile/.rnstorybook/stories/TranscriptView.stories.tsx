import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { TranscriptView } from '../../src/components/TranscriptView';

const meta = {
  title: 'Taik/TranscriptView',
  component: TranscriptView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 16 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    partialText: '…partial transcript…',
    finalText: 'Final transcript goes here.',
    isListening: false,
  },
} satisfies Meta<typeof TranscriptView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FinalOnly: Story = {
  args: {
    isListening: false,
    finalText: 'Hello from Taik. This is the final transcript.',
    partialText: '',
  },
};

export const Listening: Story = {
  args: {
    isListening: true,
    partialText: 'Hello from Taik…',
    finalText: '',
  },
};

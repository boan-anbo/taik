import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { DeckScreenView } from '../../src/screens/DeckScreenView';

const meta = {
  title: 'Taik/Screens/Deck',
  component: DeckScreenView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    buttons: [],
    isLoading: false,
    onAddButton: fn(),
    onEditButton: fn(),
  },
} satisfies Meta<typeof DeckScreenView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithButtons: Story = {
  args: {
    buttons: [
      {
        id: '1',
        label: 'Quick Reply',
        action: { type: 'insertText', text: "Thanks for your message! I'll get back to you soon." },
        showInStrip: true,
        order: 0,
      },
      {
        id: '2',
        label: 'Email Signature',
        action: { type: 'insertText', text: 'Best regards,\nJohn Doe\nSoftware Engineer' },
        showInStrip: true,
        order: 1,
      },
      {
        id: '3',
        label: 'Meeting Request',
        action: { type: 'insertText', text: 'Would you be available for a quick call this week?' },
        showInStrip: false,
        order: 2,
      },
      {
        id: '4',
        label: 'Start Recording',
        action: { type: 'startCapture' },
        showInStrip: true,
        order: 3,
      },
    ],
  },
};

export const SingleButton: Story = {
  args: {
    buttons: [
      {
        id: '1',
        label: 'Hello World',
        action: { type: 'insertText', text: 'Hello, World!' },
        showInStrip: true,
        order: 0,
      },
    ],
  },
};

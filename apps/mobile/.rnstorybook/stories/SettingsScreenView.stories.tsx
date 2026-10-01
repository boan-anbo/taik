import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { SettingsScreenView } from '../../src/screens/SettingsScreenView';

const meta = {
  title: 'Taik/Screens/Settings',
  component: SettingsScreenView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    engineSettings: {
      preferredEngine: 'soniox',
      sonioxApiKey: '',
      languageHints: ['en'],
      whisperModel: undefined,
    },
    availableEngines: ['soniox', 'apple', 'whisper'],
    session: {
      active: false,
    },
    timeRemaining: 0,
    isLoading: false,
    onEngineSelect: fn(),
    onFlowSessionToggle: fn(),
    onShowApiKeyModal: fn(),
    onShowLanguageModal: fn(),
  },
} satisfies Meta<typeof SettingsScreenView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithApiKey: Story = {
  args: {
    engineSettings: {
      preferredEngine: 'soniox',
      sonioxApiKey: 'sk-1234567890abcdef',
      languageHints: ['en'],
      whisperModel: undefined,
    },
  },
};

export const FlowSessionActive: Story = {
  args: {
    session: {
      active: true,
      startedAt: Date.now(),
      endsAt: Date.now() + 25 * 60 * 1000,
    },
    timeRemaining: 25 * 60 * 1000, // 25 minutes
  },
};

export const AppleEngineSelected: Story = {
  args: {
    engineSettings: {
      preferredEngine: 'apple',
      sonioxApiKey: '',
      languageHints: ['en', 'es'],
      whisperModel: undefined,
    },
  },
};

export const MultipleLanguages: Story = {
  args: {
    engineSettings: {
      preferredEngine: 'soniox',
      sonioxApiKey: 'sk-test-key',
      languageHints: ['en', 'es', 'fr', 'de'],
      whisperModel: undefined,
    },
  },
};

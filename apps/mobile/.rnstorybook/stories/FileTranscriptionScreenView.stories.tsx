import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { fn } from 'storybook/test';

import { FileTranscriptionScreenView } from '../../src/screens/FileTranscriptionScreenView';

const meta = {
  title: 'Taik/Screens/FileTranscription',
  component: FileTranscriptionScreenView,
  decorators: [
    (Story) => (
      <View style={{ flex: 1 }}>
        <Story />
      </View>
    ),
  ],
  args: {
    state: 'idle',
    progress: 0,
    text: '',
    audioDurationMs: 0,
    error: null,
    audioUrl: '',
    onAudioUrlChange: fn(),
    onTranscribeUrl: fn(),
    onPickFile: fn(),
    onCancel: fn(),
    onReset: fn(),
    onCopyToClipboard: fn(),
    onSendToKeyboard: fn(),
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'uploading', 'processing', 'completed', 'error'],
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof FileTranscriptionScreenView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const WithUrl: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
  },
};

export const Uploading: Story = {
  args: {
    state: 'uploading',
    progress: 25,
  },
};

export const Processing: Story = {
  args: {
    state: 'processing',
    progress: 65,
  },
};

export const Completed: Story = {
  args: {
    state: 'completed',
    text: 'This is the transcribed text from the audio file. It can be quite long depending on the length of the audio. The transcription captures all spoken words and can be used for various purposes like creating captions, generating summaries, or keeping records of meetings.',
    audioDurationMs: 185000, // 3:05
    progress: 100,
  },
};

export const ErrorState: Story = {
  args: {
    state: 'error',
    error: 'Failed to transcribe audio. Please check your API key and try again.',
  },
};

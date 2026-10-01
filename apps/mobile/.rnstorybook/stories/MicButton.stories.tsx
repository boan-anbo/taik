import type { Meta, StoryObj } from '@storybook/react-native';

import { MicButton } from '../../src/components/MicButton';
import { fn } from 'storybook/test';

const meta = {
  title: 'Taik/MicButton',
  component: MicButton,
  args: {
    onPress: fn(),
    disabled: false,
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'starting', 'recording', 'stopping', 'completed', 'error'],
    },
  },
} satisfies Meta<typeof MicButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { state: 'idle' },
};

export const Starting: Story = {
  args: { state: 'starting' },
};

export const Recording: Story = {
  args: { state: 'recording' },
};

export const Stopping: Story = {
  args: { state: 'stopping' },
};

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        className="border-destructive focus-visible:ring-destructive"
      />
      <p className="text-sm text-destructive">Please enter a valid email address.</p>
    </div>
  ),
};

const InteractiveInput = () => {
  const [value, setValue] = useState('');
  return (
    <div className="w-[300px] space-y-2">
      <label htmlFor="interactive" className="text-sm font-medium">
        Interactive Input
      </label>
      <Input
        id="interactive"
        placeholder="Type something..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="text-sm text-muted-foreground">
        Value: {value || '(empty)'}
      </p>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveInput />,
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[300px]">
      <div className="space-y-2">
        <label className="text-sm font-medium">Default</label>
        <Input placeholder="Enter text..." />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">With Value</label>
        <Input defaultValue="Some text" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Disabled</label>
        <Input defaultValue="Cannot edit" disabled />
      </div>
    </div>
  ),
};

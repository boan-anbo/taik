import type { Preview } from '@storybook/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { tokens } from '@taik/ui-tokens';

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: tokens.color.background }}>
          <Story />
        </View>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;

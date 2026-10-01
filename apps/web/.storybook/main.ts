import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: ['@storybook/addon-docs'],

  // Serve test fixtures as static files
  // Path is relative to .storybook/ directory
  staticDirs: [
    {
      from: '../../../packages/test-fixtures/assets',
      to: '/test-fixtures',
    },
  ],

  framework: '@storybook/react-vite',

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },

  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '../src'),
        },
      },
    });
  },

  docs: {
    autodocs: true,
  },
};

export default config;

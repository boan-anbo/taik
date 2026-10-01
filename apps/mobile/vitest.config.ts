import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    // Use jsdom for React Native Web rendering
    environment: 'jsdom',
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    // Include test files
    include: ['src/**/*.test.{ts,tsx}'],
    // Globals for describe, it, expect
    globals: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    // Dependencies to be inlined for proper ESM handling
    deps: {
      inline: [/react-native-web/, /@testing-library/],
    },
  },
  // Optimize deps to ensure consistent React resolution
  optimizeDeps: {
    include: ['react', 'react-dom', '@testing-library/react'],
  },
  resolve: {
    alias: {
      // Map react-native to react-native-web for browser testing
      'react-native': 'react-native-web',
      // Force consistent React 19 versions - react is at root, react-dom is local
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
      // Handle @taik packages
      '@taik/speech-engine': path.resolve(__dirname, '__mocks__/@taik/speech-engine.ts'),
    },
    // Dedupe ensures all nested dependencies use the same react instances
    dedupe: ['react', 'react-dom'],
  },
});

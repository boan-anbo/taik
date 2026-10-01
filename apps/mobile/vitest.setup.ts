/**
 * Vitest setup file
 * Configures the test environment for React Native with react-native-web
 */
import { vi } from 'vitest';

// Define __DEV__ global for React Native / Expo modules
(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;

// Note: @testing-library/react-native/extend-expect may not be compatible with jsdom
// Skip it for now and use basic assertions

// Mock expo-modules-core to avoid native module issues
vi.mock('expo-modules-core', () => ({
  requireNativeModule: vi.fn(() => ({})),
  NativeModulesProxy: {},
  EventEmitter: class {},
  Platform: { OS: 'web' },
}));

// Mock expo-clipboard
vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn().mockResolvedValue(true),
  getStringAsync: vi.fn().mockResolvedValue(''),
}));

// Mock expo-status-bar
vi.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock native audio module
vi.mock('./src/native/AudioCaptureModule', () => ({
  default: {
    startCapture: vi.fn(),
    stopCapture: vi.fn(),
  },
}));

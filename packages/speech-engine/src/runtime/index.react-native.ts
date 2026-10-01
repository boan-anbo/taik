/**
 * Runtime exports for React Native
 * Excludes Node.js and Edge adapters that use Node.js-specific APIs
 */

import type { RuntimeAdapter } from './adapter.js';
import { ReactNativeAdapter, setNativeAudioModule } from './react-native-adapter.js';

export type {
  RuntimeType,
  RuntimeAdapter,
  WebSocketAdapter,
  WebSocketConnection,
  AudioCaptureAdapter,
  AudioStream,
  FileAdapter,
} from './adapter.js';

// React Native-specific exports only
export { ReactNativeAdapter, setNativeAudioModule };
export type { NativeAudioCaptureModule } from './react-native-adapter.js';

// Browser adapter is safe (no Node.js APIs)
export { BrowserAdapter } from './browser-adapter.js';

/**
 * Detect runtime - always returns 'react-native' in this entry point
 */
export function detectRuntime(): 'react-native' {
  return 'react-native';
}

// Cached adapter instance
let cachedAdapter: RuntimeAdapter | null = null;

/**
 * Get the runtime adapter for React Native
 */
export function getRuntimeAdapter(): RuntimeAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new ReactNativeAdapter();
  }
  return cachedAdapter!;
}

/**
 * Reset the runtime adapter (for testing)
 */
export function resetRuntimeAdapter(): void {
  cachedAdapter = null;
}

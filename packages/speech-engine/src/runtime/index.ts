/**
 * Runtime exports
 */

export type {
  RuntimeType,
  RuntimeAdapter,
  WebSocketAdapter,
  WebSocketConnection,
  AudioCaptureAdapter,
  AudioStream,
  FileAdapter,
} from './adapter.js';

export { detectRuntime, getRuntimeAdapter, resetRuntimeAdapter } from './detect.js';

export { BrowserAdapter } from './browser-adapter.js';
export { NodeAdapter } from './node-adapter.js';
export type { AsyncWebSocketAdapter } from './node-adapter.js';
export { EdgeAdapter } from './edge-adapter.js';
export { ReactNativeAdapter, setNativeAudioModule } from './react-native-adapter.js';
export type { NativeAudioCaptureModule } from './react-native-adapter.js';

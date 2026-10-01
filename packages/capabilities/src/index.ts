/**
 * @taik/capabilities
 *
 * Platform capability interface contracts for Taik.
 * This package contains only TypeScript interfaces - no implementations.
 *
 * Platform implementations:
 * - Desktop: apps/desktop/src/adapters/
 * - Mobile: apps/mobile/src/adapters/
 * - Web: apps/web/src/adapters/
 */

// Storage
export type {
  IStorageAdapter,
  StorageChangeCallback,
  Unsubscribe,
  StorageErrorCode,
} from './storage';
export { StorageError } from './storage';

// System
export type {
  ISystemAdapter,
  TrayMenuItem,
  TrayMenuSeparator,
  TrayMenuEntry,
  HotkeyHandler,
  NotificationOptions,
  WindowLabel,
  SystemErrorCode,
} from './system';
export { SystemError } from './system';

// Audio
export type {
  IAudioAdapter,
  AudioFileMetadata,
  PlaybackState,
  PlaybackProgressCallback,
  AudioErrorCode,
  IMediaDeviceAdapter,
  AudioInputDevice,
  MediaStreamOptions,
  MediaDeviceErrorCode,
} from './audio';
export { AudioError, MediaDeviceError } from './audio';

// Input
export type {
  ITextInputAdapter,
  InsertTextOptions,
  InsertTextResult,
  InsertionMethod,
  TextInputErrorCode,
} from './input';
export { TextInputError } from './input';

/// <reference lib="dom" />

/**
 * Media Device Adapter Interface
 * Platform-agnostic contract for audio input device management.
 *
 * Handles:
 * - Device enumeration (list available microphones)
 * - Device monitoring (plug/unplug events)
 * - MediaStream creation with device selection
 *
 * Implementations:
 * - Browser/Tauri: navigator.mediaDevices API
 * - React Native: Expo AV (limited - usually single device)
 */

/**
 * Audio input device information
 */
export interface AudioInputDevice {
  /** Unique device identifier */
  deviceId: string;
  /** Human-readable device name */
  label: string;
  /** Device group (e.g., same physical device) */
  groupId?: string;
  /** Whether this is the system default device */
  isDefault: boolean;
}

/**
 * Options for creating a MediaStream
 */
export interface MediaStreamOptions {
  /** Specific device ID to use (undefined = default) */
  deviceId?: string;
  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean;
  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean;
  /** Enable automatic gain control (default: true) */
  autoGainControl?: boolean;
  /** Target sample rate in Hz */
  sampleRate?: number;
}

/**
 * Media device adapter interface for audio input device management
 */
export interface IMediaDeviceAdapter {
  /**
   * Check if device enumeration is supported on this platform
   */
  isSupported(): boolean;

  /**
   * Get list of available audio input devices
   * Note: Device labels may be empty until permission is granted
   * @returns Array of audio input devices
   */
  enumerateAudioInputs(): Promise<AudioInputDevice[]>;

  /**
   * Create a MediaStream from the specified device
   * @param options - Stream configuration options
   * @returns MediaStream for audio capture
   */
  getUserMedia(options?: MediaStreamOptions): Promise<MediaStream>;

  /**
   * Subscribe to device change events (connect/disconnect)
   * @param callback - Called when devices change
   * @returns Unsubscribe function
   */
  onDeviceChange(callback: () => void): () => void;

  /**
   * Request microphone permission (triggers browser permission prompt)
   * Useful for getting device labels before recording
   * @returns true if permission granted
   */
  requestPermission(): Promise<boolean>;

  /**
   * Check if microphone permission has been granted
   */
  hasPermission(): Promise<boolean>;
}

/**
 * Media device error types
 */
export type MediaDeviceErrorCode =
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'OVERCONSTRAINED'
  | 'UNKNOWN';

/**
 * Media device error class for typed error handling
 */
export class MediaDeviceError extends Error {
  constructor(
    public readonly code: MediaDeviceErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MediaDeviceError';
  }
}

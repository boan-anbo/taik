/**
 * Audio Adapter Interface
 * Platform-agnostic contract for audio operations.
 *
 * Note: Real-time recording for speech-to-text is handled by @taik/speech-engine.
 * This adapter is for file operations and playback.
 *
 * Implementations:
 * - Desktop: Tauri file system + Web Audio API
 * - Mobile: Expo AV / React Native audio
 * - Web: Web Audio API + File API
 */

/**
 * Audio file metadata
 */
export interface AudioFileMetadata {
  path: string;
  name: string;
  size: number;
  duration?: number;
  format?: string;
  sampleRate?: number;
  channels?: number;
}

/**
 * Audio playback state
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

/**
 * Playback progress callback
 */
export type PlaybackProgressCallback = (currentTime: number, duration: number) => void;

/**
 * Audio adapter interface for file operations and playback
 */
export interface IAudioAdapter {
  // =========================================================================
  // FILE OPERATIONS
  // =========================================================================

  /**
   * Open file picker dialog to select audio file
   * @returns File path or null if cancelled
   */
  pickAudioFile(): Promise<string | null>;

  /**
   * Get metadata for an audio file
   */
  getAudioMetadata(path: string): Promise<AudioFileMetadata>;

  /**
   * Read audio file as ArrayBuffer
   */
  readAudioFile(path: string): Promise<ArrayBuffer>;

  /**
   * Save audio data to file
   * @returns Saved file path
   */
  saveAudioFile(data: ArrayBuffer, suggestedName?: string): Promise<string>;

  /**
   * Check if file exists
   */
  fileExists(path: string): Promise<boolean>;

  // =========================================================================
  // PLAYBACK
  // =========================================================================

  /**
   * Load audio for playback
   */
  loadAudio(pathOrBuffer: string | ArrayBuffer): Promise<void>;

  /**
   * Start or resume playback
   */
  play(): Promise<void>;

  /**
   * Pause playback
   */
  pause(): Promise<void>;

  /**
   * Stop playback and reset position
   */
  stop(): Promise<void>;

  /**
   * Seek to position
   * @param time - Position in seconds
   */
  seek(time: number): Promise<void>;

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState;

  /**
   * Get current playback position in seconds
   */
  getCurrentTime(): number;

  /**
   * Get total duration in seconds
   */
  getDuration(): number;

  /**
   * Set playback volume
   * @param volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume: number): Promise<void>;

  /**
   * Subscribe to playback progress
   */
  onProgress(callback: PlaybackProgressCallback): () => void;

  /**
   * Subscribe to playback state changes
   */
  onStateChange(callback: (state: PlaybackState) => void): () => void;

  // =========================================================================
  // RECORDING STORAGE
  // =========================================================================

  /**
   * Save recorded audio data to file
   * @param data - Raw audio buffer
   * @param metadata - Recording metadata
   * @returns Saved file URI
   */
  saveRecordedAudio(
    data: ArrayBuffer,
    metadata: {
      duration: number;
      timestamp: number;
      format?: string;
    }
  ): Promise<string>;

  /**
   * Delete audio file by URI
   * @param uri - File URI to delete
   */
  deleteAudioFile(uri: string): Promise<void>;

  /**
   * Get the default directory for saving audio recordings
   */
  getAudioDirectory(): Promise<string>;

  // =========================================================================
  // PERMISSIONS
  // =========================================================================

  /**
   * Check if microphone permission is granted
   */
  hasMicrophonePermission(): Promise<boolean>;

  /**
   * Request microphone permission
   */
  requestMicrophonePermission(): Promise<boolean>;
}

/**
 * Audio error types
 */
export type AudioErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'PERMISSION_DENIED'
  | 'PLAYBACK_ERROR'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN';

/**
 * Audio error class for typed error handling
 */
export class AudioError extends Error {
  constructor(
    public readonly code: AudioErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AudioError';
  }
}

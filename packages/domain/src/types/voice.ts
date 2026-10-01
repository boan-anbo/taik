/**
 * Voice Input Types
 * Type definitions for voice input widget and recording workflow
 */

/**
 * Voice widget UI complexity levels
 */
export type VoiceWidgetMode = 'minimal' | 'status' | 'preview' | 'full';

/**
 * Floating voice panel theme
 */
export type VoiceTheme = 'system' | 'light' | 'dark';

/**
 * Floating voice panel layout presets
 */
export type VoicePanelLayout = 'standard' | 'strip';

/**
 * Recording/transcription mode
 * - realtime: WebSocket streaming with partial results as you speak
 * - async: Local recording, then upload for batch transcription
 */
export type RecordingMode = 'realtime' | 'async';

/**
 * Display mode for floating windows
 */
export type VoiceDisplayMode = 'voice' | 'deck' | 'combined' | 'separate';

/**
 * Output destination for recorded text
 */
export type VoiceOutputDestination =
  | 'insert' // Auto-insert into focused app
  | 'clipboard' // Copy to clipboard
  | 'both' // Insert + clipboard
  | 'history-only'; // Only save to history

/**
 * Voice input settings
 */
export interface VoiceSettings {
  /** UI complexity level for voice widget */
  widgetMode: VoiceWidgetMode;
  /** Theme for floating voice panel */
  theme: VoiceTheme;
  /** Layout preset for floating voice panel */
  panelLayout: VoicePanelLayout;
  /** Display mode for floating windows */
  displayMode: VoiceDisplayMode;
  /** Auto-hide voice window after recording completes */
  autoHideAfterRecording: boolean;
  /** Output destination for recorded text */
  outputDestination: VoiceOutputDestination;
  /** Delay before auto-hide (ms) */
  autoHideDelayMs: number;
  /** Keep window always on top */
  alwaysOnTop: boolean;
  /** Recording/transcription mode */
  recordingMode: RecordingMode;
  /** Whether to save audio files for playback in history */
  saveAudioFiles: boolean;
  /**
   * Local audio retention period in days.
   * 0 means keep forever (no automatic cleanup).
   */
  audioRetentionDays: number;
  /** Global hotkey for toggling voice recording (show window + start/stop) */
  voiceToggleHotkey: string;
  /** Selected audio input device ID (undefined = system default) */
  audioInputDeviceId?: string;
}

/**
 * Default voice settings
 */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  widgetMode: 'status',
  theme: 'system',
  panelLayout: 'standard',
  displayMode: 'voice',
  autoHideAfterRecording: true,
  outputDestination: 'insert',
  autoHideDelayMs: 500,
  alwaysOnTop: true,
  recordingMode: 'realtime',
  saveAudioFiles: true,
  audioRetentionDays: 0,
  voiceToggleHotkey: 'CommandOrControl+Shift+V',
};

/**
 * Voice recording result
 */
export interface VoiceRecordingResult {
  /** Final transcribed text */
  text: string;
  /** Recording duration in seconds */
  duration: number;
  /** Audio data (for playback) */
  audioData?: ArrayBuffer;
  /** Whether text was auto-inserted */
  wasInserted: boolean;
  /** Whether text was copied to clipboard */
  wasCopied: boolean;
  /** Whether entry was saved to history */
  wasSaved: boolean;
  /** Transcript entry ID if saved */
  entryId?: string;
}

/**
 * Voice history entry (extends TranscriptEntry with audio)
 */
export interface VoiceHistoryEntry {
  /** Unique identifier */
  id: string;
  /** Transcribed text */
  text: string;
  /** When the transcript was created (ISO string) */
  createdAt: string;
  /** Duration of the recording in seconds */
  duration: number;
  /** Audio file path or blob URL (for playback) */
  audioUri?: string;
  /** Whether text was inserted into an app */
  wasInserted: boolean;
  /** Whether text was copied to clipboard */
  wasCopied: boolean;
  /** Target app name (if inserted) */
  targetAppName?: string;
}

/**
 * Window position and size
 */
export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Voice window positions for different modes
 */
export interface VoiceWindowPositions {
  /** Voice-only window position */
  voice?: WindowPosition;
  /** Combined window position */
  combined?: WindowPosition;
}

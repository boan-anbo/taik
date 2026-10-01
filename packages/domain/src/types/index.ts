/**
 * Domain Types
 * Re-export all type definitions
 */

// Deck
export type { ButtonAction, DeckButton } from './deck';
export { DEFAULT_BUTTONS } from './deck';

// Session
export type {
  FlowSessionState,
  FlowCommand,
  FlowSessionConfig,
  PendingTranscription,
} from './session';
export { DEFAULT_FLOW_CONFIG } from './session';

// Settings
export type {
  SpeechEngineId,
  SpeechEngineSettings,
  WhisperModelStatus,
  WhisperModelInfo,
  SonioxProviderConfig,
  SonioxMode,
} from './settings';
export {
  DEFAULT_ENGINE_SETTINGS,
  DEFAULT_SONIOX_CONFIG,
  SONIOX_DEFAULT_MODELS,
  getEngineDisplayName,
  getEngineDescription,
  getActiveSonioxModel,
  getSonioxApiKey,
} from './settings';

// Transcript
export type {
  TranscriptSource,
  TranscriptVersionSource,
  TranscriptMetadata,
  TranscriptVersion,
  TranscriptEntry,
  TranscriptDisplayState,
  TranscriptResult,
  TranscriptWord,
} from './transcript';
export {
  createTranscriptEntry,
  createTranscriptVersion,
  normalizeTranscriptEntry,
  getActiveTranscriptVersion,
  generateTranscriptId,
  createTranscriptDisplayState,
  getAllWordsFromDisplayState,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from './transcript';

// Storage Keys
export { STORAGE_KEYS } from './storage-keys';
export type { StorageKey } from './storage-keys';

// Voice
export type {
  VoiceWidgetMode,
  VoiceTheme,
  VoicePanelLayout,
  VoiceDisplayMode,
  VoiceOutputDestination,
  VoiceSettings,
  VoiceRecordingResult,
  VoiceHistoryEntry,
  WindowPosition,
  VoiceWindowPositions,
  RecordingMode,
} from './voice';
export { DEFAULT_VOICE_SETTINGS } from './voice';

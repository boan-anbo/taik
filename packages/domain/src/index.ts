/**
 * @taik/domain
 *
 * Shared domain logic for Taik across all platforms.
 * Contains stores, hooks, and type definitions.
 *
 * Usage:
 * 1. Configure storage adapter before using stores:
 *    ```
 *    import { configureStorageAdapter } from '@taik/domain';
 *    import { MyStorageAdapter } from './adapters';
 *
 *    configureStorageAdapter(new MyStorageAdapter());
 *    ```
 *
 * 2. Initialize stores in app startup:
 *    ```
 *    import { initializeStores, cleanupStores } from '@taik/domain';
 *
 *    // On mount
 *    initializeStores();
 *
 *    // On unmount
 *    cleanupStores();
 *    ```
 *
 * 3. Use stores in components:
 *    ```
 *    import { useSettingsStore, useDeckStore } from '@taik/domain';
 *
 *    const { engineSettings } = useSettingsStore();
 *    const { buttons } = useDeckStore();
 *    ```
 */

// Stores
export {
  // Adapter configuration
  configureStorageAdapter,
  getStorageAdapter,
  isStorageConfigured,
  // Stores
  useSettingsStore,
  useDeckStore,
  useTranscriptStore,
  useVoiceStore,
  // Initialization
  initializeStores,
  cleanupStores,
  // Individual sync setup (if needed)
  setupSettingsStoreSync,
  cleanupSettingsStoreSync,
  setupDeckStoreSync,
  cleanupDeckStoreSync,
  setupTranscriptStoreSync,
  cleanupTranscriptStoreSync,
  setupVoiceStoreSync,
  cleanupVoiceStoreSync,
} from './stores';

// Hooks
export {
  useRecording,
  type UseRecordingReturn,
  type UseRecordingOptions,
  type RecordingState,
  useVoiceRecording,
  type UseVoiceRecordingOptions,
  type UseVoiceRecordingReturn,
  type IVoiceTextInputAdapter,
  type IVoiceSystemAdapter,
  useRealtimeTranscription,
  type UseRealtimeTranscriptionOptions,
  type UseRealtimeTranscriptionReturn,
  type RealtimeTranscriptionState,
  useAsyncTranscription,
  type UseAsyncTranscriptionOptions,
  type UseAsyncTranscriptionReturn,
  type AsyncTranscriptionState,
  useAudioVisualization,
  type UseAudioVisualizationOptions,
  type UseAudioVisualizationReturn,
  type AudioVisualizationData,
  useRecordingSession,
  type UseRecordingSessionOptions,
  type UseRecordingSessionReturn,
  type SessionState,
  type ITextInputAdapter,
  type ISystemAdapter,
  useAudioStreamManager,
  type UseAudioStreamManagerOptions,
  type UseAudioStreamManagerReturn,
  type StreamState,
} from './hooks';

// Types
export {
  // Deck
  type ButtonAction,
  type DeckButton,
  DEFAULT_BUTTONS,
  // Session
  type FlowSessionState,
  type FlowCommand,
  type FlowSessionConfig,
  type PendingTranscription,
  DEFAULT_FLOW_CONFIG,
  // Settings
  type SpeechEngineId,
  type SpeechEngineSettings,
  type WhisperModelStatus,
  type WhisperModelInfo,
  type SonioxProviderConfig,
  type SonioxMode,
  DEFAULT_ENGINE_SETTINGS,
  DEFAULT_SONIOX_CONFIG,
  SONIOX_DEFAULT_MODELS,
  getEngineDisplayName,
  getEngineDescription,
  getActiveSonioxModel,
  getSonioxApiKey,
  // Transcript
  type TranscriptSource,
  type TranscriptVersionSource,
  type TranscriptMetadata,
  type TranscriptVersion,
  type TranscriptEntry,
  type TranscriptDisplayState,
  type TranscriptResult,
  type TranscriptWord,
  createTranscriptEntry,
  createTranscriptVersion,
  normalizeTranscriptEntry,
  getActiveTranscriptVersion,
  generateTranscriptId,
  createTranscriptDisplayState,
  getAllWordsFromDisplayState,
  DEFAULT_CONFIDENCE_THRESHOLD,
  // Storage keys
  STORAGE_KEYS,
  type StorageKey,
  // Voice
  type VoiceWidgetMode,
  type VoiceTheme,
  type VoicePanelLayout,
  type VoiceDisplayMode,
  type VoiceOutputDestination,
  type VoiceSettings,
  type VoiceRecordingResult,
  type VoiceHistoryEntry,
  type WindowPosition,
  type VoiceWindowPositions,
  type RecordingMode,
  DEFAULT_VOICE_SETTINGS,
} from './types';

// Services
export {
  DeckActionExecutor,
  type IDeckActionExecutor,
  type DeckActionExecutorDeps,
  type ActionExecutionResult,
} from './services';

// Re-export capability types for convenience
export type { IStorageAdapter } from '@taik/capabilities';

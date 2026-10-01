/**
 * Settings Types
 * Type definitions for app settings and speech engine configuration
 */

/**
 * Available speech engine identifiers
 */
export type SpeechEngineId = 'apple' | 'soniox' | 'whisper';

/**
 * Soniox transcription mode
 */
export type SonioxMode = 'realtime' | 'async';

/**
 * Soniox provider-specific configuration
 */
export interface SonioxProviderConfig {
  /** API key for Soniox */
  apiKey: string;
  /** Transcription mode: realtime (streaming) or async (file upload) */
  mode: SonioxMode;
  /** Model for realtime transcription (default: stt-rt-preview) */
  realtimeModel?: string;
  /** Model for async transcription (default: stt-async-preview) */
  asyncModel?: string;
  /** Custom model override (overrides mode-specific defaults) */
  customModel?: string;
  /**
   * Realtime stop finalization: maximum time to wait for Soniox to finalize the last utterance.
   * Undefined uses engine defaults (correctness-first when pending partial).
   */
  finalizeTimeoutMs?: number;
  /**
   * Realtime stop finalization: minimum time to wait after sending `finalize` before allowing quiet-based completion.
   * Undefined uses engine defaults.
   */
  finalizeMinWaitMs?: number;
}

/**
 * Default Soniox model identifiers
 */
export const SONIOX_DEFAULT_MODELS = {
  realtime: 'stt-rt-preview',
  async: 'stt-async-preview',
} as const;

/**
 * Get the active Soniox model based on configuration
 */
export function getActiveSonioxModel(config: SonioxProviderConfig): string {
  if (config.customModel) {
    return config.customModel;
  }
  if (config.mode === 'async') {
    return config.asyncModel ?? SONIOX_DEFAULT_MODELS.async;
  }
  return config.realtimeModel ?? SONIOX_DEFAULT_MODELS.realtime;
}

/**
 * Speech engine configuration
 */
export interface SpeechEngineSettings {
  /** Preferred engine ID */
  preferredEngine: SpeechEngineId;
  /** Soniox API key (if using Soniox) - DEPRECATED: use soniox.apiKey */
  sonioxApiKey?: string;
  /** Soniox provider configuration */
  soniox?: SonioxProviderConfig;
  /** Whisper model info */
  whisperModel?: WhisperModelInfo;
  /** Language hints for recognition */
  languageHints: string[];
}

/**
 * Whisper model download status
 */
export type WhisperModelStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'error';

/**
 * Whisper model information
 */
export interface WhisperModelInfo {
  /** Model identifier (e.g., 'tiny', 'base', 'small') */
  modelId: string;
  /** Model display name */
  displayName: string;
  /** Local file path (if downloaded) */
  localPath?: string;
  /** Download progress (0-1) */
  downloadProgress: number;
  /** Current status */
  status: WhisperModelStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Default Soniox provider configuration
 */
export const DEFAULT_SONIOX_CONFIG: SonioxProviderConfig = {
  apiKey: '',
  mode: 'realtime',
  // Faster defaults for stop/finalize latency.
  finalizeTimeoutMs: 2000,
  finalizeMinWaitMs: 200,
};

/**
 * Default engine settings
 */
export const DEFAULT_ENGINE_SETTINGS: SpeechEngineSettings = {
  preferredEngine: 'soniox',
  soniox: DEFAULT_SONIOX_CONFIG,
  languageHints: ['en'],
};

/**
 * Get effective Soniox API key (handles migration from old field)
 */
export function getSonioxApiKey(settings: SpeechEngineSettings): string {
  return settings.soniox?.apiKey ?? settings.sonioxApiKey ?? '';
}

/**
 * Get display name for a speech engine
 */
export function getEngineDisplayName(engine: SpeechEngineId): string {
  switch (engine) {
    case 'apple':
      return 'Apple Speech';
    case 'soniox':
      return 'Soniox';
    case 'whisper':
      return 'Whisper (Local)';
    default:
      return engine;
  }
}

/**
 * Get description for a speech engine
 */
export function getEngineDescription(engine: SpeechEngineId): string {
  switch (engine) {
    case 'apple':
      return 'Built-in speech recognition. Works offline, no API key needed.';
    case 'soniox':
      return 'Cloud-based, high accuracy. Requires API key and internet.';
    case 'whisper':
      return 'Local AI model. Works offline after download.';
    default:
      return '';
  }
}

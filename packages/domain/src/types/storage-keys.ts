/**
 * Storage Keys
 * Consistent key names for persisted data
 */

export const STORAGE_KEYS = {
  // Deck
  deckButtons: 'deck_buttons',

  // Transcripts
  transcripts: 'transcripts',
  pendingTranscription: 'pending_transcription',

  // Flow Session (mobile-specific, but kept for compatibility)
  flowSessionActive: 'flow_session_active',
  flowSessionExpiry: 'flow_session_expiry',
  flowCommand: 'flow_command',
  isCapturing: 'is_capturing',
  requestFlowSession: 'request_flow_session',
  requestFlowSessionAt: 'request_flow_session_at',

  // Settings
  engineSettings: 'engine_settings',
  whisperModelInfo: 'whisper_model_info',

  // Desktop-specific
  windowPositions: 'window_positions',
  hotkeyBindings: 'hotkey_bindings',

  // Voice input
  voiceSettings: 'voice_settings',
  voiceWindowPositions: 'voice_window_positions',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

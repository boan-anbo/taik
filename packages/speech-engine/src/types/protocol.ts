/**
 * Soniox WebSocket protocol message types
 * Based on Soniox API specification: https://soniox.com/docs/stt/api-reference/websocket-api
 */

// ============================================================================
// Client -> Server Messages
// ============================================================================

/** Initial configuration message sent on connection */
export interface ProtocolConfigMessage {
  api_key: string;
  model: string;
  audio_format: string;
  sample_rate?: number;
  num_channels?: number;
  language_hints?: string[];
  enable_language_identification?: boolean;
  enable_speaker_diarization?: boolean;
  enable_endpoint_detection?: boolean;
  context?: {
    general?: Array<{ key: string; value: string }>;
    text?: string;
    terms?: string[];
    translation_terms?: Array<{ source: string; target: string }>;
  };
  translation?: {
    type: 'one_way' | 'two_way';
    target_language?: string;
    language_a?: string;
    language_b?: string;
  };
  client_reference_id?: string;
}

/** Keepalive message to maintain connection */
export interface ProtocolKeepaliveMessage {
  type: 'keepalive';
}

/** Finalize message to signal end of audio stream */
export interface ProtocolFinalizeMessage {
  type: 'finalize';
}

/** All client message types */
export type ClientMessage =
  | ProtocolConfigMessage
  | ProtocolKeepaliveMessage
  | ProtocolFinalizeMessage;

// ============================================================================
// Server -> Client Messages
// ============================================================================

/** Token/word in transcript response */
export interface ProtocolToken {
  text: string;
  start_ms?: number;
  end_ms?: number;
  confidence: number;
  is_final: boolean;
  speaker?: string;
  language?: string;
  source_language?: string;
  translation_status?: string;
}

/** Transcript response from server */
export interface ProtocolTranscriptMessage {
  tokens: ProtocolToken[];
  final_audio_proc_ms: number;
  total_audio_proc_ms: number;
  finished?: boolean;
  error_code?: number;
  error_message?: string;
}

/** All server message types */
export type ServerMessage = ProtocolTranscriptMessage;

// ============================================================================
// Protocol Helpers
// ============================================================================

/** Check if server message indicates completion */
export function isFinishedMessage(msg: ServerMessage): boolean {
  return msg.finished === true;
}

/** Check if server message contains an error */
export function isErrorMessage(
  msg: ServerMessage
): msg is ProtocolTranscriptMessage & { error_code: number; error_message: string } {
  return msg.error_code !== undefined && msg.error_message !== undefined;
}

/** Build config message from SonioxConfig */
export function buildConfigMessage(
  apiKey: string,
  model: string,
  audioFormat: string,
  sampleRate?: number,
  channels?: number,
  features?: {
    languageHints?: string[];
    enableLanguageIdentification?: boolean;
    enableSpeakerDiarization?: boolean;
    enableEndpointDetection?: boolean;
    context?: {
      general?: Array<{ key: string; value: string }>;
      text?: string;
      terms?: string[];
      translationTerms?: Array<{ source: string; target: string }>;
    };
    translation?: {
      type: 'one_way' | 'two_way';
      targetLanguage?: string;
      languageA?: string;
      languageB?: string;
    };
  },
  clientReferenceId?: string
): ProtocolConfigMessage {
  const msg: ProtocolConfigMessage = {
    api_key: apiKey,
    model,
    audio_format: audioFormat,
  };

  if (sampleRate !== undefined) {
    msg.sample_rate = sampleRate;
  }

  if (channels !== undefined) {
    msg.num_channels = channels;
  }

  if (features?.languageHints?.length) {
    msg.language_hints = features.languageHints;
  }

  if (features?.enableLanguageIdentification) {
    msg.enable_language_identification = true;
  }

  if (features?.enableSpeakerDiarization) {
    msg.enable_speaker_diarization = true;
  }

  if (features?.enableEndpointDetection) {
    msg.enable_endpoint_detection = true;
  }

  if (features?.context) {
    msg.context = {};
    if (features.context.general?.length) {
      msg.context.general = features.context.general;
    }
    if (features.context.text) {
      msg.context.text = features.context.text;
    }
    if (features.context.terms?.length) {
      msg.context.terms = features.context.terms;
    }
    if (features.context.translationTerms?.length) {
      msg.context.translation_terms = features.context.translationTerms;
    }
  }

  if (features?.translation) {
    msg.translation = {
      type: features.translation.type,
    };
    if (features.translation.targetLanguage) {
      msg.translation.target_language = features.translation.targetLanguage;
    }
    if (features.translation.languageA) {
      msg.translation.language_a = features.translation.languageA;
    }
    if (features.translation.languageB) {
      msg.translation.language_b = features.translation.languageB;
    }
  }

  if (clientReferenceId) {
    msg.client_reference_id = clientReferenceId;
  }

  return msg;
}

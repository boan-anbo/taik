/**
 * Custom error classes for better error handling
 */

import type { ErrorPhase } from '../types/events.js';

/** Base error class for all Soniox errors */
export class SonioxError extends Error {
  readonly code: string;
  readonly phase: ErrorPhase;
  readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    phase: ErrorPhase,
    recoverable = false,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'SonioxError';
    this.code = code;
    this.phase = phase;
    this.recoverable = recoverable;
  }
}

/** WebSocket connection errors */
export class ConnectionError extends SonioxError {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number, cause?: Error) {
    super(
      message,
      'CONNECTION_ERROR',
      'connection',
      true, // Connection errors are generally recoverable
      cause
    );
    this.name = 'ConnectionError';
    this.statusCode = statusCode;
  }
}

/** Audio capture/processing errors */
export class AudioError extends SonioxError {
  constructor(message: string, recoverable = false, cause?: Error) {
    super(message, 'AUDIO_ERROR', 'audio', recoverable, cause);
    this.name = 'AudioError';
  }
}

/** Configuration validation errors */
export class ConfigError extends SonioxError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'CONFIG_ERROR', 'connection', false);
    this.name = 'ConfigError';
    this.field = field;
  }
}

/** Soniox protocol/API errors */
export class ProtocolError extends SonioxError {
  readonly errorCode?: number;

  constructor(message: string, errorCode?: number, cause?: Error) {
    super(
      message,
      'PROTOCOL_ERROR',
      'protocol',
      errorCode === 503, // Service unavailable is recoverable
      cause
    );
    this.name = 'ProtocolError';
    this.errorCode = errorCode;
  }
}

/** Feature not supported in current runtime */
export class UnsupportedError extends SonioxError {
  readonly runtime: string;
  readonly feature: string;

  constructor(feature: string, runtime: string) {
    super(
      `${feature} is not supported in ${runtime} runtime`,
      'UNSUPPORTED_ERROR',
      'audio',
      false
    );
    this.name = 'UnsupportedError';
    this.runtime = runtime;
    this.feature = feature;
  }
}

/** Transcription errors from Soniox API */
export class TranscriptionError extends SonioxError {
  constructor(message: string, errorCode?: number) {
    const recoverable = errorCode === 503 || errorCode === 408;
    super(message, 'TRANSCRIPTION_ERROR', 'transcription', recoverable);
    this.name = 'TranscriptionError';
  }
}

/** Map Soniox error codes to user-friendly messages */
export function getErrorMessage(code: number, message: string): string {
  switch (code) {
    case 400:
      return `Bad request: ${message}`;
    case 401:
      return 'Invalid API key. Please check your credentials.';
    case 402:
      return 'Payment required. Please check your Soniox account.';
    case 408:
      return 'Request timeout. The connection was idle for too long.';
    case 429:
      return 'Rate limit exceeded. Please slow down requests.';
    case 500:
      return 'Soniox server error. Please try again later.';
    case 503:
      return 'Soniox service unavailable. Please try again later.';
    default:
      return message || `Unknown error (code: ${code})`;
  }
}

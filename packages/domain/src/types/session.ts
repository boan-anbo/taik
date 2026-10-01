/**
 * Flow Session Types
 * Type definitions for flow session management
 */

/**
 * Flow session state
 */
export interface FlowSessionState {
  /** Whether a flow session is currently active */
  active: boolean;
  /** Session expiry time (ISO string) */
  expiresAt: string | null;
  /** Whether the app is currently capturing audio */
  isCapturing: boolean;
  /** Pending command from keyboard/deck */
  pendingCommand: FlowCommand | null;
}

/**
 * Commands that can be sent to control flow
 */
export type FlowCommand = 'startCapture' | 'stopCapture';

/**
 * Flow session configuration
 */
export interface FlowSessionConfig {
  /** Session timeout in milliseconds (default: 30 minutes) */
  timeoutMs: number;
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
}

/**
 * Default flow session configuration
 */
export const DEFAULT_FLOW_CONFIG: FlowSessionConfig = {
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  pollIntervalMs: 500,
};

/**
 * Pending transcription waiting to be used
 */
export interface PendingTranscription {
  /** The transcribed text */
  text: string;
  /** When it was created (ISO string) */
  createdAt: string;
  /** Whether it has been consumed */
  consumed: boolean;
}

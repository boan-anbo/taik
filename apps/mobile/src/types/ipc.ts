/**
 * IPC Protocol Types
 * Mobile-specific types for communication between RN app and keyboard extension.
 * Shared types (DeckButton, FlowSessionState, etc.) are imported from @taik/domain.
 */

// Re-export shared types from domain for convenience
export type {
  DeckButton,
  ButtonAction,
  FlowSessionState,
  FlowCommand,
  FlowSessionConfig,
  PendingTranscription,
  SpeechEngineId,
  SpeechEngineSettings,
  WhisperModelStatus,
  WhisperModelInfo,
} from '@taik/domain';

export {
  DEFAULT_BUTTONS,
  DEFAULT_FLOW_CONFIG,
  DEFAULT_ENGINE_SETTINGS,
} from '@taik/domain';

// Re-export storage keys from domain
export { STORAGE_KEYS } from '@taik/domain';

// =============================================================================
// IPC Command Protocol (Mobile-specific)
// =============================================================================

import type { SpeechEngineId } from '@taik/domain';

/** Base command structure */
export interface IPCCommand<T extends string = string, P = unknown> {
  /** Unique command ID for tracking */
  commandId: string;
  /** Command type */
  type: T;
  /** Command payload */
  payload: P;
  /** When command was created (ISO string) */
  createdAt: string;
  /** When command expires (ISO string) */
  expiresAt: string;
  /** Command state */
  state: 'pending' | 'processing' | 'completed' | 'failed';
  /** Result reference (for completed commands) */
  resultRef?: string;
  /** Error message (for failed commands) */
  errorMessage?: string;
}

/** Command to start audio capture */
export type StartCaptureCommand = IPCCommand<
  'startCapture',
  {
    sessionId: string;
    engine: SpeechEngineId;
  }
>;

/** Command to stop audio capture */
export type StopCaptureCommand = IPCCommand<'stopCapture', { sessionId: string }>;

/** Command to insert text (from deck button) */
export type InsertTextCommand = IPCCommand<'insertText', { text: string }>;

/** Union of all command types */
export type AnyIPCCommand =
  | StartCaptureCommand
  | StopCaptureCommand
  | InsertTextCommand;

// =============================================================================
// Utility Functions
// =============================================================================

/** Generate a unique command ID */
export function generateCommandId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Check if a command has expired */
export function isCommandExpired(command: IPCCommand): boolean {
  return new Date(command.expiresAt) < new Date();
}

/** Create a new command with default expiry (30 seconds) */
export function createCommand<T extends string, P>(
  type: T,
  payload: P,
  ttlMs: number = 30000
): IPCCommand<T, P> {
  const now = new Date();
  return {
    commandId: generateCommandId(),
    type,
    payload,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    state: 'pending',
  };
}

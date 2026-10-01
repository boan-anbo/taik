/**
 * Shared Storage Expo Module
 * TypeScript interface for App Groups shared storage
 * Supports: Deck buttons, Flow sessions, Transcriptions, Engine settings
 * Used for IPC between main app and keyboard extension
 */

import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';
import type {
  DeckButton,
  FlowSessionState,
  PendingTranscription,
  SpeechEngineSettings,
  FlowCommand,
} from '@taik/domain';

// Import native module
const SharedStorageModule = NativeModulesProxy.SharedStorage as SharedStorageModuleType;

// Create typed event emitter
const emitter = new (EventEmitter as any)(SharedStorageModule) as {
  addListener<T>(eventName: string, listener: (event: T) => void): { remove: () => void };
};

// =============================================================================
// Event Types
// =============================================================================

/** Storage change event payload */
export interface StorageChangeEvent {
  key: string;
  value: unknown;
}

/** Buttons changed event payload */
export interface ButtonsChangedEvent {
  buttons: DeckButton[];
}

/** Flow session changed event payload */
export interface FlowSessionChangedEvent {
  active: boolean;
  expiresAt?: string;
}

/** Transcription ready event payload */
export interface TranscriptionReadyEvent {
  text: string;
  timestamp: number;
}

/** Capture state changed event payload */
export interface CaptureStateChangedEvent {
  isCapturing: boolean;
}

// =============================================================================
// Native Module Type
// =============================================================================

interface SharedStorageModuleType {
  // App Group
  getAppGroupIdentifier(): string;

  // Deck Buttons
  getButtons(): Promise<DeckButton[]>;
  setButtons(buttons: DeckButton[]): Promise<void>;
  addButton(button: DeckButton): Promise<void>;
  updateButton(button: DeckButton): Promise<void>;
  deleteButton(buttonId: string): Promise<void>;

  // Pending Transcription
  setPendingTranscription(text: string): Promise<void>;
  getPendingTranscription(): Promise<PendingTranscription | null>;
  clearPendingTranscription(): Promise<void>;
  markTranscriptionConsumed(): Promise<void>;
  hasPendingTranscription(): Promise<boolean>;

  // Flow Session
  getFlowSessionState(): Promise<FlowSessionState>;
  startFlowSession(timeoutMs: number): Promise<void>;
  endFlowSession(): Promise<void>;
  setCapturing(capturing: boolean): Promise<void>;
  setFlowCommand(command: FlowCommand | null): Promise<void>;
  consumeFlowCommand(): Promise<FlowCommand | null>;
  requestFlowSession(): Promise<void>;
  consumeFlowSessionRequest(): Promise<boolean>;

  // Engine Settings
  getEngineSettings(): Promise<SpeechEngineSettings | null>;
  setEngineSettings(settings: SpeechEngineSettings): Promise<void>;

  // Darwin Notifications
  subscribeToDarwinNotification(name: string): Promise<void>;
  unsubscribeFromDarwinNotification(name: string): Promise<void>;
  postDarwinNotification(name: string): Promise<void>;
}

// =============================================================================
// App Group
// =============================================================================

/**
 * Get the App Group identifier
 */
export function getAppGroupIdentifier(): string {
  return SharedStorageModule.getAppGroupIdentifier();
}

// =============================================================================
// Deck Buttons
// =============================================================================

/**
 * Get all deck buttons, sorted by order
 */
export async function getButtons(): Promise<DeckButton[]> {
  return SharedStorageModule.getButtons();
}

/**
 * Set all deck buttons (replaces existing)
 */
export async function setButtons(buttons: DeckButton[]): Promise<void> {
  return SharedStorageModule.setButtons(buttons);
}

/**
 * Add a new deck button
 */
export async function addButton(button: DeckButton): Promise<void> {
  return SharedStorageModule.addButton(button);
}

/**
 * Update an existing deck button
 */
export async function updateButton(button: DeckButton): Promise<void> {
  return SharedStorageModule.updateButton(button);
}

/**
 * Delete a deck button by ID
 */
export async function deleteButton(buttonId: string): Promise<void> {
  return SharedStorageModule.deleteButton(buttonId);
}

// =============================================================================
// Pending Transcription
// =============================================================================

/**
 * Set pending transcription for keyboard insertion
 */
export async function setPendingTranscription(text: string): Promise<void> {
  return SharedStorageModule.setPendingTranscription(text);
}

/**
 * Get pending transcription
 */
export async function getPendingTranscription(): Promise<PendingTranscription | null> {
  return SharedStorageModule.getPendingTranscription();
}

/**
 * Clear pending transcription
 */
export async function clearPendingTranscription(): Promise<void> {
  return SharedStorageModule.clearPendingTranscription();
}

/**
 * Mark transcription as consumed by keyboard
 */
export async function markTranscriptionConsumed(): Promise<void> {
  return SharedStorageModule.markTranscriptionConsumed();
}

/**
 * Check if there's a pending transcription
 */
export async function hasPendingTranscription(): Promise<boolean> {
  return SharedStorageModule.hasPendingTranscription();
}

// =============================================================================
// Flow Session
// =============================================================================

/**
 * Get current flow session state
 */
export async function getFlowSessionState(): Promise<FlowSessionState> {
  return SharedStorageModule.getFlowSessionState();
}

/**
 * Start a new flow session
 * @param timeoutMs Session timeout in milliseconds (default: 30 minutes)
 */
export async function startFlowSession(timeoutMs: number = 30 * 60 * 1000): Promise<void> {
  return SharedStorageModule.startFlowSession(timeoutMs);
}

/**
 * End the current flow session
 */
export async function endFlowSession(): Promise<void> {
  return SharedStorageModule.endFlowSession();
}

/**
 * Set capturing state (main app -> keyboard)
 */
export async function setCapturing(capturing: boolean): Promise<void> {
  return SharedStorageModule.setCapturing(capturing);
}

/**
 * Set flow command (keyboard -> main app)
 */
export async function setFlowCommand(command: FlowCommand | null): Promise<void> {
  return SharedStorageModule.setFlowCommand(command);
}

/**
 * Consume flow command (main app reads and clears)
 */
export async function consumeFlowCommand(): Promise<FlowCommand | null> {
  return SharedStorageModule.consumeFlowCommand();
}

/**
 * Request flow session from keyboard (background enable)
 */
export async function requestFlowSession(): Promise<void> {
  return SharedStorageModule.requestFlowSession();
}

/**
 * Check and consume flow session request
 */
export async function consumeFlowSessionRequest(): Promise<boolean> {
  return SharedStorageModule.consumeFlowSessionRequest();
}

// =============================================================================
// Engine Settings
// =============================================================================

/**
 * Get engine settings
 */
export async function getEngineSettings(): Promise<SpeechEngineSettings | null> {
  return SharedStorageModule.getEngineSettings();
}

/**
 * Set engine settings
 */
export async function setEngineSettings(settings: SpeechEngineSettings): Promise<void> {
  return SharedStorageModule.setEngineSettings(settings);
}

// =============================================================================
// Darwin Notifications
// =============================================================================

/**
 * Subscribe to a Darwin notification
 */
export async function subscribeToDarwinNotification(name: string): Promise<void> {
  return SharedStorageModule.subscribeToDarwinNotification(name);
}

/**
 * Unsubscribe from a Darwin notification
 */
export async function unsubscribeFromDarwinNotification(name: string): Promise<void> {
  return SharedStorageModule.unsubscribeFromDarwinNotification(name);
}

/**
 * Post a Darwin notification
 */
export async function postDarwinNotification(name: string): Promise<void> {
  return SharedStorageModule.postDarwinNotification(name);
}

// =============================================================================
// Event Listeners
// =============================================================================

/**
 * Subscribe to storage changes (generic)
 */
export function addStorageChangeListener(
  listener: (event: StorageChangeEvent) => void
): { remove: () => void } {
  return emitter.addListener('onStorageChange', listener);
}

/**
 * Subscribe to buttons changes
 */
export function addButtonsChangedListener(
  listener: (event: ButtonsChangedEvent) => void
): { remove: () => void } {
  return emitter.addListener('onButtonsChanged', listener);
}

/**
 * Subscribe to flow session changes
 */
export function addFlowSessionChangedListener(
  listener: (event: FlowSessionChangedEvent) => void
): { remove: () => void } {
  return emitter.addListener('onFlowSessionChanged', listener);
}

/**
 * Subscribe to transcription ready events
 */
export function addTranscriptionReadyListener(
  listener: (event: TranscriptionReadyEvent) => void
): { remove: () => void } {
  return emitter.addListener('onTranscriptionReady', listener);
}

/**
 * Subscribe to capture state changes
 */
export function addCaptureStateChangedListener(
  listener: (event: CaptureStateChangedEvent) => void
): { remove: () => void } {
  return emitter.addListener('onCaptureStateChanged', listener);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  // App Group
  getAppGroupIdentifier,

  // Deck Buttons
  getButtons,
  setButtons,
  addButton,
  updateButton,
  deleteButton,

  // Pending Transcription
  setPendingTranscription,
  getPendingTranscription,
  clearPendingTranscription,
  markTranscriptionConsumed,
  hasPendingTranscription,

  // Flow Session
  getFlowSessionState,
  startFlowSession,
  endFlowSession,
  setCapturing,
  setFlowCommand,
  consumeFlowCommand,
  requestFlowSession,
  consumeFlowSessionRequest,

  // Engine Settings
  getEngineSettings,
  setEngineSettings,

  // Darwin Notifications
  subscribeToDarwinNotification,
  unsubscribeFromDarwinNotification,
  postDarwinNotification,

  // Event Listeners
  addStorageChangeListener,
  addButtonsChangedListener,
  addFlowSessionChangedListener,
  addTranscriptionReadyListener,
  addCaptureStateChangedListener,
};

// Re-export types from domain
export type {
  DeckButton,
  FlowSessionState,
  PendingTranscription,
  SpeechEngineSettings,
  FlowCommand,
} from '@taik/domain';

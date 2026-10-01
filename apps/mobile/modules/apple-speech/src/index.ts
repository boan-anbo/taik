/**
 * Apple Speech Expo Module
 * TypeScript interface for iOS Speech Framework
 */

import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

// Import native module
const AppleSpeechModule = NativeModulesProxy.AppleSpeech as AppleSpeechModuleType;

// Create typed event emitter
const emitter = new (EventEmitter as any)(AppleSpeechModule) as {
  addListener<T>(eventName: string, listener: (event: T) => void): { remove: () => void };
};

// =============================================================================
// Types
// =============================================================================

/** Recognition options */
export interface RecognitionOptions {
  /** Locale for recognition (e.g., 'en-US') */
  locale?: string;
  /** Force on-device recognition (if available) */
  onDevice?: boolean;
}

/** Availability check result */
export interface AvailabilityResult {
  available: boolean;
  authorizationStatus: 'authorized' | 'denied' | 'restricted' | 'notDetermined';
  supportsOnDeviceRecognition: boolean;
  locale: string;
  reason?: string;
}

/** Authorization result */
export interface AuthorizationResult {
  status: string;
  granted: boolean;
}

/** Partial result event */
export interface PartialResultEvent {
  sessionId: string;
  text: string;
}

/** Final result event */
export interface FinalResultEvent {
  sessionId: string;
  text: string;
  confidence: number;
}

/** Error event */
export interface ErrorEvent {
  sessionId: string;
  error: string;
  code: number;
}

/** State change event */
export interface StateChangeEvent {
  sessionId: string;
  state: 'active' | 'stopped' | 'error';
}

/** Native module type */
interface AppleSpeechModuleType {
  checkAvailability(): Promise<AvailabilityResult>;
  requestAuthorization(): Promise<AuthorizationResult>;
  startRecognition(options: RecognitionOptions): Promise<string>;
  stopRecognition(sessionId: string): Promise<void>;
  sendAudioBuffer(sessionId: string, base64Data: string): Promise<void>;
  getSupportedLocales(): string[];
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Check if Apple Speech recognition is available
 */
export async function checkAvailability(): Promise<AvailabilityResult> {
  return AppleSpeechModule.checkAvailability();
}

/**
 * Request speech recognition authorization
 */
export async function requestAuthorization(): Promise<AuthorizationResult> {
  return AppleSpeechModule.requestAuthorization();
}

/**
 * Start a recognition session
 * @param options Recognition options
 * @returns Session ID
 */
export async function startRecognition(options: RecognitionOptions = {}): Promise<string> {
  return AppleSpeechModule.startRecognition(options);
}

/**
 * Stop a recognition session
 * @param sessionId Session ID to stop
 */
export async function stopRecognition(sessionId: string): Promise<void> {
  return AppleSpeechModule.stopRecognition(sessionId);
}

/**
 * Send audio buffer to recognition session
 * @param sessionId Session ID
 * @param base64Data Base64-encoded PCM audio data
 */
export async function sendAudioBuffer(sessionId: string, base64Data: string): Promise<void> {
  return AppleSpeechModule.sendAudioBuffer(sessionId, base64Data);
}

/**
 * Get supported locales
 */
export function getSupportedLocales(): string[] {
  return AppleSpeechModule.getSupportedLocales();
}

// =============================================================================
// Event Listeners
// =============================================================================

/**
 * Subscribe to partial recognition results
 */
export function addPartialResultListener(
  listener: (event: PartialResultEvent) => void
): { remove: () => void } {
  return emitter.addListener('onPartialResult', listener);
}

/**
 * Subscribe to final recognition results
 */
export function addFinalResultListener(
  listener: (event: FinalResultEvent) => void
): { remove: () => void } {
  return emitter.addListener('onFinalResult', listener);
}

/**
 * Subscribe to errors
 */
export function addErrorListener(
  listener: (event: ErrorEvent) => void
): { remove: () => void } {
  return emitter.addListener('onError', listener);
}

/**
 * Subscribe to state changes
 */
export function addStateChangeListener(
  listener: (event: StateChangeEvent) => void
): { remove: () => void } {
  return emitter.addListener('onStateChange', listener);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  checkAvailability,
  requestAuthorization,
  startRecognition,
  stopRecognition,
  sendAudioBuffer,
  getSupportedLocales,
  addPartialResultListener,
  addFinalResultListener,
  addErrorListener,
  addStateChangeListener,
};

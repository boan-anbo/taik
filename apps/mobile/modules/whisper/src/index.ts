/**
 * Whisper Expo Module
 * TypeScript interface for local Whisper speech recognition
 */

import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

// Import native module
const WhisperModule = NativeModulesProxy.Whisper as WhisperModuleType;

// Create typed event emitter
const emitter = new (EventEmitter as any)(WhisperModule) as {
  addListener<T>(eventName: string, listener: (event: T) => void): { remove: () => void };
};

// =============================================================================
// Types
// =============================================================================

/** Available Whisper model IDs */
export type WhisperModelId = 'tiny' | 'base' | 'small' | 'medium';

/** Transcription options */
export interface TranscriptionOptions {
  /** Language hint (e.g., 'en', 'es') */
  language?: string;
  /** Enable translation to English */
  translate?: boolean;
}

/** Availability check result */
export interface AvailabilityResult {
  available: boolean;
  modelLoaded: boolean;
  modelPath: string | null;
  supportedModels: WhisperModelId[];
}

/** Model download result */
export interface DownloadResult {
  modelId: WhisperModelId;
  path: string;
  alreadyDownloaded: boolean;
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
}

/** State change event */
export interface StateChangeEvent {
  sessionId?: string;
  state: 'modelLoaded' | 'modelUnloaded' | 'started' | 'stopped';
  modelPath?: string;
}

/** Download progress event */
export interface DownloadProgressEvent {
  modelId: WhisperModelId;
  progress: number;
}

/** Native module type */
interface WhisperModuleType {
  checkAvailability(): Promise<AvailabilityResult>;
  loadModel(modelPath: string): Promise<void>;
  unloadModel(): Promise<void>;
  startTranscription(options: TranscriptionOptions): Promise<string>;
  processAudioBuffer(sessionId: string, base64Data: string): Promise<void>;
  stopTranscription(sessionId: string): Promise<void>;
  downloadModel(modelId: WhisperModelId): Promise<DownloadResult>;
  getModelPath(modelId: WhisperModelId): string | null;
  deleteModel(modelId: WhisperModelId): Promise<void>;
}

// =============================================================================
// Functions
// =============================================================================

/**
 * Check if Whisper is available
 */
export async function checkAvailability(): Promise<AvailabilityResult> {
  return WhisperModule.checkAvailability();
}

/**
 * Load a Whisper model
 * @param modelPath Path to the model file
 */
export async function loadModel(modelPath: string): Promise<void> {
  return WhisperModule.loadModel(modelPath);
}

/**
 * Unload the current model to free memory
 */
export async function unloadModel(): Promise<void> {
  return WhisperModule.unloadModel();
}

/**
 * Start a transcription session
 * @param options Transcription options
 * @returns Session ID
 */
export async function startTranscription(options: TranscriptionOptions = {}): Promise<string> {
  return WhisperModule.startTranscription(options);
}

/**
 * Process an audio buffer
 * @param sessionId Session ID
 * @param base64Data Base64-encoded PCM audio data
 */
export async function processAudioBuffer(sessionId: string, base64Data: string): Promise<void> {
  return WhisperModule.processAudioBuffer(sessionId, base64Data);
}

/**
 * Stop transcription and get final result
 * @param sessionId Session ID
 */
export async function stopTranscription(sessionId: string): Promise<void> {
  return WhisperModule.stopTranscription(sessionId);
}

/**
 * Download a Whisper model
 * @param modelId Model identifier (tiny, base, small, medium)
 */
export async function downloadModel(modelId: WhisperModelId): Promise<DownloadResult> {
  return WhisperModule.downloadModel(modelId);
}

/**
 * Get the local path for a downloaded model
 * @param modelId Model identifier
 * @returns Path if downloaded, null otherwise
 */
export function getModelPath(modelId: WhisperModelId): string | null {
  return WhisperModule.getModelPath(modelId);
}

/**
 * Delete a downloaded model
 * @param modelId Model identifier
 */
export async function deleteModel(modelId: WhisperModelId): Promise<void> {
  return WhisperModule.deleteModel(modelId);
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

/**
 * Subscribe to model download progress
 */
export function addDownloadProgressListener(
  listener: (event: DownloadProgressEvent) => void
): { remove: () => void } {
  return emitter.addListener('onModelDownloadProgress', listener);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  checkAvailability,
  loadModel,
  unloadModel,
  startTranscription,
  processAudioBuffer,
  stopTranscription,
  downloadModel,
  getModelPath,
  deleteModel,
  addPartialResultListener,
  addFinalResultListener,
  addErrorListener,
  addStateChangeListener,
  addDownloadProgressListener,
};

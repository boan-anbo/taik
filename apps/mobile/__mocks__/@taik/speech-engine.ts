/**
 * Mock for @taik/speech-engine library
 * Simulates SonioxSession for testing
 */

import { vi } from 'vitest';

// Types matching the real library
export interface TranscriptWord {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: number;
}

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  words?: TranscriptWord[];
  speaker?: number;
}

type SessionEvent = 'transcript' | 'error' | 'connected' | 'completed';
type EventCallback = (...args: any[]) => void;

// Track mock sessions for testing
let mockSessions: MockSonioxSession[] = [];

export class MockSonioxSession {
  private eventHandlers: Map<SessionEvent, EventCallback[]> = new Map();
  private _isStarted = false;
  private _isStopped = false;
  public options: any;

  constructor(options: any) {
    this.options = options;
    mockSessions.push(this);
  }

  on(event: SessionEvent, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(callback);
    this.eventHandlers.set(event, handlers);
  }

  off(event: SessionEvent, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event) || [];
    this.eventHandlers.set(event, handlers.filter(h => h !== callback));
  }

  async startMicrophone(options?: any): Promise<void> {
    this._isStarted = true;
    // Simulate connection
    setTimeout(() => {
      this.__emit('connected', undefined);
    }, 0);
  }

  async stop(): Promise<void> {
    this._isStopped = true;
  }

  dispose(): void {
    this.eventHandlers.clear();
    mockSessions = mockSessions.filter(s => s !== this);
  }

  // Test helpers - emit events
  __emit(event: SessionEvent, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error(`Error in ${event} handler:`, e);
      }
    });
  }

  __emitTranscript(text: string, isFinal: boolean, words?: TranscriptWord[]): void {
    this.__emit('transcript', { text, isFinal, words });
  }

  __emitError(message: string, recoverable: boolean): void {
    this.__emit('error', { error: new Error(message), recoverable });
  }

  __emitCompleted(fullText: string): void {
    this.__emit('completed', { fullText });
  }

  get isStarted(): boolean {
    return this._isStarted;
  }

  get isStopped(): boolean {
    return this._isStopped;
  }
}

// Export as SonioxSession
export const SonioxSession = MockSonioxSession;

// Test helpers
export const __getLatestSession = (): MockSonioxSession | undefined => {
  return mockSessions[mockSessions.length - 1];
};

export const __getAllSessions = (): MockSonioxSession[] => {
  return [...mockSessions];
};

export const __reset = (): void => {
  mockSessions.forEach(s => s.dispose());
  mockSessions = [];
};

// Mock setNativeAudioModule
export const setNativeAudioModule = vi.fn();

// Mock runtime detection
export const detectRuntime = vi.fn().mockReturnValue('react-native');
export const getRuntimeAdapter = vi.fn();

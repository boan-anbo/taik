/**
 * Native Audio Capture Module wrapper
 * Bridges the Expo native module to the soniox NativeAudioCaptureModule interface
 */

import { Platform } from 'react-native';
import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';
import type { NativeAudioCaptureModule } from '@taik/speech-engine';

// Get the native module via Expo Modules Core
const NativeAudioCapture = NativeModulesProxy.AudioCapture as {
  startCapture(options: {
    sampleRate: number;
    channels: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  }): Promise<string>;
  stopCapture(sessionId: string): Promise<void>;
} | undefined;

// Create typed event emitter - cast to any to work around expo-modules-core type changes
const eventEmitter = NativeAudioCapture
  ? new (EventEmitter as any)(NativeAudioCapture) as {
      addListener<T>(eventName: string, listener: (event: T) => void): { remove: () => void };
    }
  : null;

/**
 * Audio capture module that implements the NativeAudioCaptureModule interface
 * expected by the speech-engine ReactNativeAdapter
 */
export const AudioCaptureModule: NativeAudioCaptureModule = {
  /**
   * Start audio capture
   */
  async startCapture(options: {
    sampleRate: number;
    channels: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
  }): Promise<string> {
    if (!NativeAudioCapture) {
      throw new Error(
        'AudioCapture native module not available. ' +
          'Make sure you ran `npx expo prebuild` and rebuilt the app.'
      );
    }

    return NativeAudioCapture.startCapture(options);
  },

  /**
   * Stop audio capture
   */
  async stopCapture(sessionId: string): Promise<void> {
    if (!NativeAudioCapture) {
      throw new Error('AudioCapture native module not available');
    }

    return NativeAudioCapture.stopCapture(sessionId);
  },

  /**
   * Add event listener - overloaded implementation
   */
  addListener(
    eventName: 'onAudioChunk' | 'onAudioError',
    callback: ((event: { sessionId: string; data: string; timestamp: number }) => void) |
              ((event: { sessionId: string; error: string }) => void)
  ): { remove: () => void } {
    if (!eventEmitter) {
      console.warn('AudioCapture event emitter not available');
      return { remove: () => {} };
    }

    const subscription = eventEmitter.addListener(eventName, callback as any);
    return {
      remove: () => subscription.remove(),
    };
  },
} as NativeAudioCaptureModule;

/**
 * Check if audio capture is available
 */
export function isAudioCaptureAvailable(): boolean {
  return Platform.OS === 'ios' && NativeAudioCapture !== null;
}

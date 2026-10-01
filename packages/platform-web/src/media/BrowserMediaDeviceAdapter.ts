/// <reference lib="dom" />

/**
 * Browser Media Device Adapter
 * Implementation of IMediaDeviceAdapter using navigator.mediaDevices API.
 *
 * Works in:
 * - Standard web browsers
 * - Tauri webview
 * - Chrome extension UI contexts
 */

import type {
  IMediaDeviceAdapter,
  AudioInputDevice,
  MediaStreamOptions,
  MediaDeviceErrorCode,
} from '@taik/capabilities';
import { MediaDeviceError } from '@taik/capabilities';

export class BrowserMediaDeviceAdapter implements IMediaDeviceAdapter {
  isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.enumerateDevices === 'function' &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  async enumerateAudioInputs(): Promise<AudioInputDevice[]> {
    if (!this.isSupported()) {
      throw new MediaDeviceError('NOT_SUPPORTED', 'Media devices API not supported');
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      return audioInputs.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        groupId: device.groupId || undefined,
        isDefault: device.deviceId === 'default' || device.deviceId === '',
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getUserMedia(options?: MediaStreamOptions): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new MediaDeviceError('NOT_SUPPORTED', 'Media devices API not supported');
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options?.deviceId ? { exact: options.deviceId } : undefined,
          echoCancellation: options?.echoCancellation ?? true,
          noiseSuppression: options?.noiseSuppression ?? true,
          autoGainControl: options?.autoGainControl ?? true,
          sampleRate: options?.sampleRate,
        },
      };

      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  onDeviceChange(callback: () => void): () => void {
    if (!this.isSupported()) {
      return () => {};
    }

    navigator.mediaDevices.addEventListener('devicechange', callback);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', callback);
    };
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new MediaDeviceError('NOT_SUPPORTED', 'Media devices API not supported');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return false;
      }
      throw this.mapError(error);
    }
  }

  async hasPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state === 'granted';
      } catch {
        // Fall back below
      }
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      return audioInputs.some((d) => d.label !== '');
    } catch {
      return false;
    }
  }

  private mapError(error: unknown): MediaDeviceError {
    if (error instanceof DOMException) {
      let code: MediaDeviceErrorCode;
      let message: string;

      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          code = 'PERMISSION_DENIED';
          message = 'Microphone permission denied';
          break;
        case 'SecurityError':
          code = 'NOT_SUPPORTED';
          message = 'Microphone access requires a secure context (HTTPS or a trusted app origin)';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          code = 'DEVICE_NOT_FOUND';
          message = 'No audio input device found';
          break;
        case 'OverconstrainedError':
          code = 'OVERCONSTRAINED';
          message = 'Cannot satisfy audio constraints';
          break;
        case 'NotSupportedError':
          code = 'NOT_SUPPORTED';
          message = 'Media devices not supported';
          break;
        default:
          code = 'UNKNOWN';
          message = error.message || 'Unknown media device error';
      }

      return new MediaDeviceError(code, message, error);
    }

    return new MediaDeviceError(
      'UNKNOWN',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
}

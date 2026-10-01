/**
 * Audio Stream Manager Hook
 * Manages audio input devices and provides a unified MediaStream
 * for both waveform visualization and recording/transcription.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IMediaDeviceAdapter, AudioInputDevice, MediaStreamOptions } from '@taik/capabilities';
import { useVoiceStore } from '../stores/voiceStore';

/**
 * Stream manager state
 */
export type StreamState = 'idle' | 'initializing' | 'active' | 'error';

/**
 * Hook options
 */
export interface UseAudioStreamManagerOptions {
  /** Media device adapter implementation */
  deviceAdapter: IMediaDeviceAdapter;
  /** Auto-request permission on mount */
  autoRequestPermission?: boolean;
  /** Stream options for getUserMedia */
  streamOptions?: Omit<MediaStreamOptions, 'deviceId'>;
}

/**
 * Hook return type
 */
export interface UseAudioStreamManagerReturn {
  /** Current stream state */
  state: StreamState;
  /** Available audio input devices */
  devices: AudioInputDevice[];
  /** Currently selected device ID (undefined = system default) */
  selectedDeviceId: string | undefined;
  /** Current active MediaStream (null when not streaming) */
  stream: MediaStream | null;
  /** Whether microphone permission is granted */
  hasPermission: boolean;
  /** Error message if state is 'error' */
  error: string | null;
  /** Start audio stream with optional device selection */
  startStream: (deviceId?: string) => Promise<MediaStream>;
  /** Stop audio stream */
  stopStream: () => void;
  /** Select a different device (stops current stream if active) */
  selectDevice: (deviceId: string | undefined) => Promise<void>;
  /** Refresh device list */
  refreshDevices: () => Promise<void>;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for managing audio input devices and MediaStream
 */
export function useAudioStreamManager(
  options: UseAudioStreamManagerOptions
): UseAudioStreamManagerReturn {
  const { deviceAdapter, autoRequestPermission = false, streamOptions } = options;

  const { settings, updateSettings } = useVoiceStore();
  const selectedDeviceId = settings.audioInputDeviceId;

  const [state, setState] = useState<StreamState>('idle');
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Refresh device list
   */
  const refreshDevices = useCallback(async () => {
    if (!deviceAdapter.isSupported()) {
      return;
    }

    try {
      const inputDevices = await deviceAdapter.enumerateAudioInputs();
      if (isMountedRef.current) {
        setDevices(inputDevices);
      }

      // Check if selected device still exists
      if (selectedDeviceId) {
        const deviceExists = inputDevices.some(d => d.deviceId === selectedDeviceId);
        if (!deviceExists) {
          // Selected device was disconnected, reset to default
          await updateSettings({ audioInputDeviceId: undefined });
        }
      }
    } catch (err) {
      console.error('[useAudioStreamManager] Failed to enumerate devices:', err);
    }
  }, [deviceAdapter, selectedDeviceId, updateSettings]);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!deviceAdapter.isSupported()) {
      if (isMountedRef.current) {
        setError('Media devices not supported on this platform');
      }
      return false;
    }

    try {
      const granted = await deviceAdapter.requestPermission();
      if (isMountedRef.current) {
        setHasPermission(granted);
      }

      if (granted) {
        // Refresh devices to get labels after permission is granted
        await refreshDevices();
      }

      return granted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Permission request failed';
      if (isMountedRef.current) {
        setError(message);
      }
      return false;
    }
  }, [deviceAdapter, refreshDevices]);

  /**
   * Stop current stream
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (isMountedRef.current) {
        setStream(null);
        setState('idle');
      }
    }
  }, []);

  /**
   * Start audio stream
   */
  const startStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    // Stop existing stream first
    stopStream();

    if (isMountedRef.current) {
      setState('initializing');
      setError(null);
    }

    try {
      const opts: MediaStreamOptions = {
        ...streamOptions,
        deviceId: deviceId ?? selectedDeviceId,
      };

      const mediaStream = await deviceAdapter.getUserMedia(opts);
      streamRef.current = mediaStream;

      if (isMountedRef.current) {
        setStream(mediaStream);
        setState('active');
      }

      return mediaStream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start audio stream';
      if (isMountedRef.current) {
        setError(message);
        setState('error');
      }
      throw err;
    }
  }, [deviceAdapter, selectedDeviceId, streamOptions, stopStream]);

  /**
   * Select a different device
   */
  const selectDevice = useCallback(async (deviceId: string | undefined) => {
    // Update persisted setting
    await updateSettings({ audioInputDeviceId: deviceId });

    // If stream is active, restart with new device
    if (streamRef.current) {
      await startStream(deviceId);
    }
  }, [updateSettings, startStream]);

  /**
   * Check initial permission and set up device change listener
   */
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      if (!deviceAdapter.isSupported()) {
        return;
      }

      // Check current permission state
      const permitted = await deviceAdapter.hasPermission();
      if (isMountedRef.current) {
        setHasPermission(permitted);
      }

      if (permitted) {
        await refreshDevices();
      } else if (autoRequestPermission) {
        await requestPermission();
      }
    };

    init();

    // Subscribe to device changes
    const unsubscribe = deviceAdapter.onDeviceChange(() => {
      refreshDevices();
    });

    return () => {
      isMountedRef.current = false;
      stopStream();
      unsubscribe();
    };
  }, [deviceAdapter, autoRequestPermission, refreshDevices, requestPermission, stopStream]);

  return {
    state,
    devices,
    selectedDeviceId,
    stream,
    hasPermission,
    error,
    startStream,
    stopStream,
    selectDevice,
    refreshDevices,
    requestPermission,
  };
}

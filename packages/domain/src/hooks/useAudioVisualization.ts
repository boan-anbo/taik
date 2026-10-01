/**
 * Audio Visualization Hook
 * Extracts real-time waveform and volume data from audio stream
 * Uses Web Audio API's AnalyserNode
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Audio visualization data
 */
export interface AudioVisualizationData {
  /** Waveform levels (0-1 normalized amplitude values) */
  waveform: number[];
  /** Current volume level (0-1) */
  volume: number;
  /** Peak volume since last reset */
  peak: number;
}

/**
 * Hook options
 */
export interface UseAudioVisualizationOptions {
  /** FFT size for analysis (default: 256) */
  fftSize?: number;
  /** Number of bars in waveform (default: 32) */
  barCount?: number;
  /** Smoothing time constant (0-1, default: 0.8) */
  smoothingTimeConstant?: number;
  /** Update interval in ms (default: 33) */
  updateInterval?: number;
  /** Scale factor for waveform sensitivity (default: 2.2) */
  levelScale?: number;
}

/**
 * Hook return type
 */
export interface UseAudioVisualizationReturn {
  /** Current visualization data */
  data: AudioVisualizationData;
  /** Whether visualization is active */
  isActive: boolean;
  /** Whether audio context is blocked awaiting user gesture */
  needsUserActivation: boolean;
  /** Attempt to resume the AudioContext after a user gesture */
  resume: () => Promise<void>;
  /** Connect to a MediaStream */
  connect: (stream: MediaStream) => void;
  /** Disconnect and cleanup */
  disconnect: () => void;
  /** Reset peak value */
  resetPeak: () => void;
}

const DEFAULT_DATA: AudioVisualizationData = {
  waveform: [],
  volume: 0,
  peak: 0,
};

/**
 * Hook for extracting real-time audio visualization data
 *
 * @example
 * ```tsx
 * const { data, connect, disconnect } = useAudioVisualization();
 *
 * // When recording starts
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 * connect(stream);
 *
 * // Render waveform
 * <Waveform levels={data.waveform} volume={data.volume} />
 *
 * // When recording stops
 * disconnect();
 * ```
 */
export function useAudioVisualization(
  options: UseAudioVisualizationOptions = {}
): UseAudioVisualizationReturn {
  const {
    fftSize = 256,
    barCount = 32,
    smoothingTimeConstant = 0.8,
    updateInterval = 33,
    levelScale = 2.2,
  } = options;

  // State
  const [data, setData] = useState<AudioVisualizationData>(DEFAULT_DATA);
  const [isActive, setIsActive] = useState(false);
  const [needsUserActivation, setNeedsUserActivation] = useState(false);

  // Refs for Web Audio nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  /**
   * Cleanup all resources
   * Note: AudioContext.close() is async but we can't await in cleanup callbacks.
   * We capture the context ref immediately and close in background with error handling.
   */
  const cleanup = useCallback(() => {
    // Stop polling loop
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Disconnect analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context (Fix #2: properly handle async close)
    // Capture ref and nullify immediately to prevent double-close
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;

    if (audioContext && audioContext.state !== 'closed') {
      // close() returns a Promise - handle errors to prevent unhandled rejection
      audioContext.close().catch((err) => {
        console.warn('[useAudioVisualization] Error closing AudioContext:', err);
      });
    }

    setNeedsUserActivation(false);
  }, []);

  /**
   * Connect to a MediaStream and start visualization
   */
  const connect = useCallback(
    (stream: MediaStream) => {
      // Cleanup any existing connection
      cleanup();

      try {
        // Create audio context
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        // Attempt to resume in environments with autoplay policies (e.g., WebView)
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            if (audioContext.state !== 'running') {
              setNeedsUserActivation(true);
            } else {
              setNeedsUserActivation(false);
            }
          }).catch((err) => {
            console.warn('[useAudioVisualization] AudioContext resume failed:', err);
            setNeedsUserActivation(true);
          });
        } else {
          setNeedsUserActivation(false);
        }

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;
        analyserRef.current = analyser;

        // Connect stream to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        // Data buffer for analysis (time-domain samples)
        const dataArray = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (!analyserRef.current) return;

          // Get time-domain data (more intuitive "mic activity" signal than FFT bins)
          analyserRef.current.getByteTimeDomainData(dataArray);

          // Calculate volume (RMS of centered time-domain samples)
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const centered = (dataArray[i]! - 128) / 128; // [-1, 1]
            sumSquares += centered * centered;
          }
          const volume = Math.min(1, Math.sqrt(sumSquares / dataArray.length));

          // Update peak
          if (volume > peakRef.current) {
            peakRef.current = volume;
          }

          // Downsample to barCount for waveform (avg absolute amplitude per segment)
          const waveform: number[] = [];
          const step = Math.floor(dataArray.length / barCount);
          for (let i = 0; i < barCount; i++) {
            let segmentSum = 0;
            for (let j = 0; j < step; j++) {
              const centered = (dataArray[i * step + j]! - 128) / 128;
              segmentSum += Math.abs(centered);
            }
            const raw = Math.min(1, segmentSum / step);
            const amplified = Math.min(1, raw * levelScale);
            const shaped = Math.pow(amplified, 0.7);
            waveform.push(shaped);
          }

          setData({
            waveform,
            volume,
            peak: peakRef.current,
          });
        };

        // Use an interval instead of rAF so updates keep flowing when the window isn't focused.
        intervalRef.current = window.setInterval(tick, updateInterval);
        tick();

        setIsActive(true);
      } catch (error) {
        console.error('Failed to connect audio visualization:', error);
        setNeedsUserActivation(true);
        cleanup();
      }
    },
    [fftSize, smoothingTimeConstant, barCount, updateInterval, levelScale, cleanup]
  );

  /**
   * Disconnect and cleanup
   */
  const disconnect = useCallback(() => {
    cleanup();
    setIsActive(false);
    setData(DEFAULT_DATA);
    peakRef.current = 0;
    setNeedsUserActivation(false);
  }, [cleanup]);

  const resume = useCallback(async () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      setNeedsUserActivation(audioContext.state !== 'running');
    } catch (err) {
      console.warn('[useAudioVisualization] AudioContext resume failed:', err);
      setNeedsUserActivation(true);
    }
  }, []);

  /**
   * Reset peak value
   */
  const resetPeak = useCallback(() => {
    peakRef.current = 0;
    setData((prev) => ({ ...prev, peak: 0 }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    data,
    isActive,
    needsUserActivation,
    resume,
    connect,
    disconnect,
    resetPeak,
  };
}

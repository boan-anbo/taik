/**
 * Mock for AudioCaptureModule
 * Simulates native audio capture behavior for testing
 */

type AudioChunkCallback = (event: { sessionId: string; data: string; timestamp: number }) => void;
type AudioErrorCallback = (event: { sessionId: string; error: string }) => void;

// Store callbacks for testing
let chunkCallbacks: AudioChunkCallback[] = [];
let errorCallbacks: AudioErrorCallback[] = [];
let currentSessionId: string | null = null;
let isCapturing = false;

// Mock functions
export const mockStartCapture = jest.fn().mockImplementation(async () => {
  currentSessionId = `mock-session-${Date.now()}`;
  isCapturing = true;
  return currentSessionId;
});

export const mockStopCapture = jest.fn().mockImplementation(async () => {
  isCapturing = false;
  currentSessionId = null;
});

export const mockAddListener = jest.fn().mockImplementation((eventName: string, callback: Function) => {
  if (eventName === 'onAudioChunk') {
    chunkCallbacks.push(callback as AudioChunkCallback);
  } else if (eventName === 'onAudioError') {
    errorCallbacks.push(callback as AudioErrorCallback);
  }
  return {
    remove: jest.fn(() => {
      if (eventName === 'onAudioChunk') {
        chunkCallbacks = chunkCallbacks.filter(cb => cb !== callback);
      } else if (eventName === 'onAudioError') {
        errorCallbacks = errorCallbacks.filter(cb => cb !== callback);
      }
    }),
  };
});

// Test helpers - use these to simulate native events
export const __simulateAudioChunk = (data: string, timestamp?: number) => {
  if (!currentSessionId) return;
  const event = {
    sessionId: currentSessionId,
    data,
    timestamp: timestamp ?? Date.now(),
  };
  chunkCallbacks.forEach(cb => cb(event));
};

export const __simulateAudioError = (error: string) => {
  if (!currentSessionId) return;
  const event = {
    sessionId: currentSessionId,
    error,
  };
  errorCallbacks.forEach(cb => cb(event));
};

export const __reset = () => {
  chunkCallbacks = [];
  errorCallbacks = [];
  currentSessionId = null;
  isCapturing = false;
  mockStartCapture.mockClear();
  mockStopCapture.mockClear();
  mockAddListener.mockClear();
};

export const __getState = () => ({
  isCapturing,
  currentSessionId,
  chunkCallbackCount: chunkCallbacks.length,
  errorCallbackCount: errorCallbacks.length,
});

// The actual module export
export const AudioCaptureModule = {
  startCapture: mockStartCapture,
  stopCapture: mockStopCapture,
  addListener: mockAddListener,
};

export const isAudioCaptureAvailable = jest.fn().mockReturnValue(true);

export default AudioCaptureModule;

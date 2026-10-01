/**
 * Mock for SharedStorage module
 * Simulates App Groups shared storage for testing
 */

import { vi } from 'vitest';

interface PendingTranscription {
  text: string;
  timestamp: number;
  consumed: boolean;
}

// In-memory storage for testing
let pendingTranscription: PendingTranscription | null = null;
let storageChangeCallbacks: Array<(event: { key: string; value: string | null }) => void> = [];

// Mock functions
export const mockSetPendingTranscription = vi.fn().mockImplementation(async (text: string) => {
  pendingTranscription = {
    text,
    timestamp: Date.now(),
    consumed: false,
  };
  storageChangeCallbacks.forEach(cb => cb({ key: 'pendingTranscription', value: text }));
});

export const mockGetPendingTranscription = vi.fn().mockImplementation(async () => {
  return pendingTranscription;
});

export const mockClearPendingTranscription = vi.fn().mockImplementation(async () => {
  pendingTranscription = null;
  storageChangeCallbacks.forEach(cb => cb({ key: 'pendingTranscription', value: null }));
});

export const mockMarkTranscriptionConsumed = vi.fn().mockImplementation(async () => {
  if (pendingTranscription) {
    pendingTranscription.consumed = true;
  }
});

export const mockHasPendingTranscription = vi.fn().mockImplementation(async () => {
  return pendingTranscription !== null && !pendingTranscription.consumed;
});

export const mockGetAppGroupIdentifier = vi.fn().mockReturnValue('group.app.carrel.taik');

export const mockAddStorageChangeListener = vi.fn().mockImplementation((callback) => {
  storageChangeCallbacks.push(callback);
  return {
    remove: vi.fn(() => {
      storageChangeCallbacks = storageChangeCallbacks.filter(cb => cb !== callback);
    }),
  };
});

// Test helpers
export const __reset = () => {
  pendingTranscription = null;
  storageChangeCallbacks = [];
  mockSetPendingTranscription.mockClear();
  mockGetPendingTranscription.mockClear();
  mockClearPendingTranscription.mockClear();
  mockMarkTranscriptionConsumed.mockClear();
  mockHasPendingTranscription.mockClear();
  mockGetAppGroupIdentifier.mockClear();
  mockAddStorageChangeListener.mockClear();
};

export const __getState = () => ({
  pendingTranscription,
  listenerCount: storageChangeCallbacks.length,
});

export const __setPendingTranscription = (data: PendingTranscription | null) => {
  pendingTranscription = data;
};

// Default export matching module structure
const SharedStorage = {
  setPendingTranscription: mockSetPendingTranscription,
  getPendingTranscription: mockGetPendingTranscription,
  clearPendingTranscription: mockClearPendingTranscription,
  markTranscriptionConsumed: mockMarkTranscriptionConsumed,
  hasPendingTranscription: mockHasPendingTranscription,
  getAppGroupIdentifier: mockGetAppGroupIdentifier,
  addStorageChangeListener: mockAddStorageChangeListener,
};

export default SharedStorage;

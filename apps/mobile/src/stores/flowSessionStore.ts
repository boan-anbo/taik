/**
 * Flow Session Store
 * Zustand store for managing Flow Session state with SharedStorage sync
 */

import { create } from 'zustand';
import SharedStorage, {
  addFlowSessionChangedListener,
  addCaptureStateChangedListener,
} from '../../modules/shared-storage/src';
import type { FlowSessionState, FlowCommand } from '@taik/domain';
import { DEFAULT_FLOW_CONFIG } from '@taik/domain';

interface FlowSessionStoreState {
  /** Current flow session state */
  session: FlowSessionState;
  /** Time remaining in session (ms) */
  timeRemaining: number | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  /** Load current session state from SharedStorage */
  loadSessionState: () => Promise<void>;
  /** Start a new flow session */
  startSession: (timeoutMs?: number) => Promise<void>;
  /** End the current flow session */
  endSession: () => Promise<void>;
  /** Update capturing state */
  setCapturing: (capturing: boolean) => Promise<void>;
  /** Process pending flow command from keyboard */
  consumeCommand: () => Promise<FlowCommand | null>;
  /** Update time remaining (called by timer) */
  updateTimeRemaining: () => void;
  /** Clear error */
  clearError: () => void;
}

export const useFlowSessionStore = create<FlowSessionStoreState>((set, get) => ({
  session: {
    active: false,
    expiresAt: null,
    isCapturing: false,
    pendingCommand: null,
  },
  timeRemaining: null,
  isLoading: false,
  error: null,

  loadSessionState: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = await SharedStorage.getFlowSessionState();
      set({
        session: state,
        isLoading: false,
      });
      get().updateTimeRemaining();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load session state',
        isLoading: false,
      });
    }
  },

  startSession: async (timeoutMs = DEFAULT_FLOW_CONFIG.timeoutMs) => {
    set({ isLoading: true, error: null });
    try {
      await SharedStorage.startFlowSession(timeoutMs);
      const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
      set({
        session: {
          active: true,
          expiresAt,
          isCapturing: false,
          pendingCommand: null,
        },
        isLoading: false,
      });
      get().updateTimeRemaining();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to start session',
        isLoading: false,
      });
    }
  },

  endSession: async () => {
    set({ isLoading: true, error: null });
    try {
      await SharedStorage.endFlowSession();
      set({
        session: {
          active: false,
          expiresAt: null,
          isCapturing: false,
          pendingCommand: null,
        },
        timeRemaining: null,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to end session',
        isLoading: false,
      });
    }
  },

  setCapturing: async (capturing) => {
    try {
      await SharedStorage.setCapturing(capturing);
      set((state) => ({
        session: {
          ...state.session,
          isCapturing: capturing,
        },
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update capturing state',
      });
    }
  },

  consumeCommand: async () => {
    try {
      const command = await SharedStorage.consumeFlowCommand();
      if (command) {
        set((state) => ({
          session: {
            ...state.session,
            pendingCommand: null,
          },
        }));
      }
      return command;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to consume command',
      });
      return null;
    }
  },

  updateTimeRemaining: () => {
    const { session } = get();
    if (!session.active || !session.expiresAt) {
      set({ timeRemaining: null });
      return;
    }

    const expiry = new Date(session.expiresAt).getTime();
    const remaining = expiry - Date.now();

    if (remaining <= 0) {
      // Session expired
      set({
        session: {
          ...session,
          active: false,
        },
        timeRemaining: 0,
      });
      // Auto-end expired session
      SharedStorage.endFlowSession().catch(() => {});
    } else {
      set({ timeRemaining: remaining });
    }
  },

  clearError: () => set({ error: null }),
}));

// Subscriptions
let sessionSubscription: { remove: () => void } | null = null;
let captureSubscription: { remove: () => void } | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

export function setupFlowSessionSync() {
  if (sessionSubscription) return;

  // Subscribe to flow session changes
  sessionSubscription = addFlowSessionChangedListener((event) => {
    useFlowSessionStore.setState((state) => ({
      session: {
        ...state.session,
        active: event.active,
        expiresAt: event.expiresAt ?? null,
      },
    }));
    useFlowSessionStore.getState().updateTimeRemaining();
  });

  // Subscribe to capture state changes
  captureSubscription = addCaptureStateChangedListener((event) => {
    useFlowSessionStore.setState((state) => ({
      session: {
        ...state.session,
        isCapturing: event.isCapturing,
      },
    }));
  });

  // Set up timer for time remaining updates
  timerInterval = setInterval(() => {
    useFlowSessionStore.getState().updateTimeRemaining();
  }, 1000);

  // Initial load
  useFlowSessionStore.getState().loadSessionState();
}

export function cleanupFlowSessionSync() {
  sessionSubscription?.remove();
  sessionSubscription = null;

  captureSubscription?.remove();
  captureSubscription = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Helper to format time remaining
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

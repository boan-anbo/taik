/**
 * Deck Buttons Store
 * Zustand store for managing deck buttons with storage sync
 */

import { create } from 'zustand';
import { getStorageAdapter, addStorageChangeListener } from './adapter';
import type { DeckButton } from '../types/deck';
import { DEFAULT_BUTTONS } from '../types/deck';
import { STORAGE_KEYS } from '../types/storage-keys';

interface DeckState {
  /** All deck buttons */
  buttons: DeckButton[];
  /** Buttons visible in strip/floating deck */
  stripButtons: DeckButton[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  /** Load buttons from storage */
  loadButtons: () => Promise<void>;
  /** Add a new button */
  addButton: (button: Omit<DeckButton, 'order'>) => Promise<void>;
  /** Update an existing button */
  updateButton: (button: DeckButton) => Promise<void>;
  /** Delete a button */
  deleteButton: (buttonId: string) => Promise<void>;
  /** Reorder buttons */
  reorderButtons: (buttons: DeckButton[]) => Promise<void>;
  /** Initialize default buttons if none exist */
  initializeDefaults: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  buttons: [],
  stripButtons: [],
  isLoading: false,
  error: null,

  loadButtons: async () => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorageAdapter();
      const buttons = await storage.get<DeckButton[]>(STORAGE_KEYS.deckButtons);
      const sortedButtons = (buttons ?? []).sort((a, b) => a.order - b.order);
      set({
        buttons: sortedButtons,
        stripButtons: sortedButtons.filter((b) => b.showInStrip),
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load buttons',
        isLoading: false,
      });
    }
  },

  addButton: async (buttonData) => {
    const { buttons } = get();
    const newButton: DeckButton = {
      ...buttonData,
      order: buttons.length,
    };

    try {
      const storage = getStorageAdapter();
      const updatedButtons = [...buttons, newButton];
      await storage.set(STORAGE_KEYS.deckButtons, updatedButtons);
      set({
        buttons: updatedButtons,
        stripButtons: updatedButtons.filter((b) => b.showInStrip),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add button',
      });
    }
  },

  updateButton: async (button) => {
    try {
      const storage = getStorageAdapter();
      const { buttons } = get();
      const updatedButtons = buttons.map((b) =>
        b.id === button.id ? button : b
      );
      await storage.set(STORAGE_KEYS.deckButtons, updatedButtons);
      set({
        buttons: updatedButtons,
        stripButtons: updatedButtons.filter((b) => b.showInStrip),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update button',
      });
    }
  },

  deleteButton: async (buttonId) => {
    try {
      const storage = getStorageAdapter();
      const { buttons } = get();
      const updatedButtons = buttons.filter((b) => b.id !== buttonId);
      await storage.set(STORAGE_KEYS.deckButtons, updatedButtons);
      set({
        buttons: updatedButtons,
        stripButtons: updatedButtons.filter((b) => b.showInStrip),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete button',
      });
    }
  },

  reorderButtons: async (reorderedButtons) => {
    const withUpdatedOrder = reorderedButtons.map((b, index) => ({
      ...b,
      order: index,
    }));

    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.deckButtons, withUpdatedOrder);
      set({
        buttons: withUpdatedOrder,
        stripButtons: withUpdatedOrder.filter((b) => b.showInStrip),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to reorder buttons',
      });
    }
  },

  initializeDefaults: async () => {
    const { buttons } = get();
    if (buttons.length === 0) {
      try {
        const storage = getStorageAdapter();
        await storage.set(STORAGE_KEYS.deckButtons, DEFAULT_BUTTONS);
        set({
          buttons: DEFAULT_BUTTONS,
          stripButtons: DEFAULT_BUTTONS.filter((b) => b.showInStrip),
        });
      } catch (err) {
        set({
          error:
            err instanceof Error
              ? err.message
              : 'Failed to initialize defaults',
        });
      }
    }
  },

  clearError: () => set({ error: null }),
}));

// Subscription management
let deckSubscription: (() => void) | null = null;

/**
 * Set up deck store sync with storage
 */
export function setupDeckStoreSync(): void {
  if (deckSubscription) return;

  deckSubscription = addStorageChangeListener(STORAGE_KEYS.deckButtons, (event) => {
    if (event.buttons) {
      const sortedButtons = (event.buttons as DeckButton[]).sort(
        (a, b) => a.order - b.order
      );
      useDeckStore.setState({
        buttons: sortedButtons,
        stripButtons: sortedButtons.filter((b) => b.showInStrip),
      });
    }
  });

  // Initial load
  useDeckStore.getState().loadButtons();
}

/**
 * Clean up deck store sync
 */
export function cleanupDeckStoreSync(): void {
  deckSubscription?.();
  deckSubscription = null;
}

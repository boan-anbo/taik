/**
 * Transcript Store
 * Zustand store for managing transcript history
 */

import { create } from 'zustand';
import { getStorageAdapter, addStorageChangeListener } from './adapter';
import type {
  TranscriptEntry,
  TranscriptSource,
  TranscriptMetadata,
  TranscriptVersion,
} from '../types/transcript';
import {
  createTranscriptEntry,
  createTranscriptVersion,
  normalizeTranscriptEntry,
  getActiveTranscriptVersion,
} from '../types/transcript';
import { STORAGE_KEYS } from '../types/storage-keys';

interface TranscriptState {
  /** All transcript entries */
  entries: TranscriptEntry[];
  /** Currently selected entry ID */
  selectedId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Actions
  /** Load entries from storage */
  loadEntries: () => Promise<void>;
  /** Add a new transcript entry */
  addEntry: (
    text: string,
    source: TranscriptSource,
    duration: number,
    metadata?: TranscriptMetadata
  ) => Promise<TranscriptEntry>;
  /** Add a new version to an existing entry */
  addVersion: (
    entryId: string,
    input: Omit<TranscriptVersion, 'id' | 'createdAt'>
  ) => Promise<TranscriptEntry | null>;
  /** Set active version for an entry */
  setActiveVersion: (entryId: string, versionId: string) => Promise<void>;
  /** Delete an entry */
  deleteEntry: (id: string) => Promise<void>;
  /** Clear audioUri metadata for a set of entries (history text remains) */
  clearAudioUrisForEntries: (ids: string[]) => Promise<number>;
  /** Clear all entries */
  clearEntries: () => Promise<void>;
  /** Select an entry */
  selectEntry: (id: string | null) => void;
  /** Search entries by text */
  searchEntries: (query: string) => TranscriptEntry[];
  /** Get entry by ID */
  getEntry: (id: string) => TranscriptEntry | undefined;
  /** Clear error */
  clearError: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  entries: [],
  selectedId: null,
  isLoading: false,
  error: null,

  loadEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const storage = getStorageAdapter();
      const entries = await storage.get<TranscriptEntry[]>(STORAGE_KEYS.transcripts);
      // Sort by creation date, newest first
      const normalizedEntries = (entries ?? []).map((entry) => {
        const normalized = normalizeTranscriptEntry(entry);
        const active = getActiveTranscriptVersion(normalized);
        if (active && active.text !== normalized.text) {
          return { ...normalized, text: active.text };
        }
        return normalized;
      });
      const sortedEntries = normalizedEntries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      set({ entries: sortedEntries, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load transcripts',
        isLoading: false,
      });
    }
  },

  addEntry: async (text, source, duration, metadata) => {
    const newEntry = createTranscriptEntry(text, source, duration, metadata);

    try {
      const storage = getStorageAdapter();
      const { entries } = get();
      const updatedEntries = [newEntry, ...entries];
      await storage.set(STORAGE_KEYS.transcripts, updatedEntries);
      set({ entries: updatedEntries });
      return newEntry;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save transcript',
      });
      throw err;
    }
  },

  addVersion: async (entryId, input) => {
    try {
      const storage = getStorageAdapter();
      const { entries } = get();
      const updatedEntries = entries.map((entry) => {
        if (entry.id !== entryId) return entry;
        const normalized = normalizeTranscriptEntry(entry);
        const version = createTranscriptVersion({
          ...input,
          createdAt: new Date().toISOString(),
        });
        const versions = [...(normalized.versions ?? []), version];
        return {
          ...normalized,
          text: version.text,
          versions,
          activeVersionId: version.id,
        };
      });

      await storage.set(STORAGE_KEYS.transcripts, updatedEntries);
      set({ entries: updatedEntries });
      return updatedEntries.find((e) => e.id === entryId) ?? null;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save transcript version',
      });
      return null;
    }
  },

  setActiveVersion: async (entryId, versionId) => {
    try {
      const storage = getStorageAdapter();
      const { entries } = get();
      const updatedEntries = entries.map((entry) => {
        if (entry.id !== entryId) return entry;
        const normalized = normalizeTranscriptEntry(entry);
        const version = (normalized.versions ?? []).find((v) => v.id === versionId);
        if (!version) return normalized;
        return {
          ...normalized,
          text: version.text,
          activeVersionId: version.id,
        };
      });
      await storage.set(STORAGE_KEYS.transcripts, updatedEntries);
      set({ entries: updatedEntries });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update active version',
      });
    }
  },

  deleteEntry: async (id) => {
    try {
      const storage = getStorageAdapter();
      const { entries, selectedId } = get();
      const updatedEntries = entries.filter((e) => e.id !== id);
      await storage.set(STORAGE_KEYS.transcripts, updatedEntries);
      set({
        entries: updatedEntries,
        selectedId: selectedId === id ? null : selectedId,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete transcript',
      });
    }
  },

  clearAudioUrisForEntries: async (ids) => {
    if (!ids.length) return 0;
    const idSet = new Set(ids);

    try {
      const storage = getStorageAdapter();
      const { entries } = get();
      let changed = 0;

      const updatedEntries = entries.map((entry) => {
        if (!idSet.has(entry.id) || !entry.metadata?.audioUri) return entry;
        changed += 1;
        return {
          ...entry,
          metadata: {
            ...entry.metadata,
            audioUri: undefined,
          },
        };
      });

      if (!changed) return 0;

      await storage.set(STORAGE_KEYS.transcripts, updatedEntries);
      set({ entries: updatedEntries });
      return changed;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to clear audio references',
      });
      return 0;
    }
  },

  clearEntries: async () => {
    try {
      const storage = getStorageAdapter();
      await storage.set(STORAGE_KEYS.transcripts, []);
      set({ entries: [], selectedId: null });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to clear transcripts',
      });
    }
  },

  selectEntry: (id) => {
    set({ selectedId: id });
  },

  searchEntries: (query) => {
    const { entries } = get();
    const lowerQuery = query.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.text.toLowerCase().includes(lowerQuery) ||
        entry.metadata?.fileName?.toLowerCase().includes(lowerQuery) ||
        (entry.versions ?? []).some((v) => v.text.toLowerCase().includes(lowerQuery))
    );
  },

  getEntry: (id) => {
    const { entries } = get();
    return entries.find((e) => e.id === id);
  },

  clearError: () => set({ error: null }),
}));

// Subscription management
let transcriptSubscription: (() => void) | null = null;

/**
 * Set up transcript store sync with storage
 */
export function setupTranscriptStoreSync(): void {
  if (transcriptSubscription) return;

  transcriptSubscription = addStorageChangeListener(
    STORAGE_KEYS.transcripts,
    () => {
      // Reload entries when storage changes externally
      useTranscriptStore.getState().loadEntries();
    }
  );

  // Initial load
  useTranscriptStore.getState().loadEntries();
}

/**
 * Clean up transcript store sync
 */
export function cleanupTranscriptStoreSync(): void {
  transcriptSubscription?.();
  transcriptSubscription = null;
}

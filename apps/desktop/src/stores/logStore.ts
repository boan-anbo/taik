import { create } from 'zustand';

export type LogLevel =
  | 'debug'
  | 'info'
  | 'log'
  | 'warn'
  | 'error'
  | 'uncaught'
  | 'promise';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  windowLabel: string;
  message: string;
}

interface LogStoreState {
  entries: LogEntry[];
  maxEntries: number;
  addEntry: (entry: LogEntry) => void;
  clear: () => void;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeLogEntry(input: Omit<LogEntry, 'id'>): LogEntry {
  return {
    id: createId(),
    ...input,
  };
}

export const useLogStore = create<LogStoreState>((set, get) => ({
  entries: [],
  maxEntries: 800,
  addEntry: (entry) => {
    const { maxEntries } = get();
    set((state) => {
      const next = [...state.entries, entry];
      if (next.length <= maxEntries) return { entries: next };
      return { entries: next.slice(next.length - maxEntries) };
    });
  },
  clear: () => set({ entries: [] }),
}));


/**
 * Transcript Types
 * Type definitions for transcript entries and history
 */

import type { TranscriptResult, TranscriptWord, AsyncTranscriptToken } from '@taik/speech-engine';

/**
 * Source of a transcript
 */
export type TranscriptSource = 'live' | 'file';

/**
 * Version source (original or re-transcribed)
 */
export type TranscriptVersionSource = 'original' | 'retranscribe';

/**
 * Re-export speech-engine types for convenience
 */
export type { TranscriptResult, TranscriptWord } from '@taik/speech-engine';

/**
 * Display state for transcript visualization (provider-agnostic)
 * This interface enables visual feedback for partial vs final text
 */
export interface TranscriptDisplayState {
  /** All finalized transcript segments */
  finalSegments: TranscriptResult[];
  /** Current partial/interim segment (may change) */
  partialSegment: TranscriptResult | null;
  /** Fully concatenated text */
  fullText: string;
}

/**
 * Create a display state from results array
 * Preserves spacing emitted by the speech engine across segments
 */
export function createTranscriptDisplayState(
  finalResults: TranscriptResult[],
  partialResult?: TranscriptResult | null
): TranscriptDisplayState {
  const fullText = finalResults.map((r) => r.text).join('').trim();

  return {
    finalSegments: finalResults,
    partialSegment: partialResult ?? null,
    fullText,
  };
}

/**
 * Get all words from display state (final + partial)
 * Useful for word-level confidence visualization
 */
export function getAllWordsFromDisplayState(
  state: TranscriptDisplayState
): TranscriptWord[] {
  const finalWords = state.finalSegments.flatMap((s) => s.words ?? []);
  const partialWords = state.partialSegment?.words ?? [];
  return [...finalWords, ...partialWords];
}

/**
 * Confidence threshold for "confirmed" text visualization
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Transcript entry metadata
 */
export interface TranscriptMetadata {
  /** Original file name (if from file) */
  fileName?: string;
  /** Number of speakers detected */
  speakerCount?: number;
  /** Audio duration in seconds */
  audioDuration?: number;
  /** Speech engine used */
  engine?: string;
  /** Speech model used */
  model?: string;
  /** Language detected/used */
  language?: string;
  /** Audio file URI for playback (if saved) */
  audioUri?: string;
  /** Recording mode used */
  recordingMode?: 'realtime' | 'async';
}

/**
 * A single transcript version (multiple per entry)
 */
export interface TranscriptVersion {
  /** Unique identifier */
  id: string;
  /** Text for this version */
  text: string;
  /** When this version was created */
  createdAt: string;
  /** Source of this version */
  source: TranscriptVersionSource;
  /** Engine used */
  engine?: string;
  /** Model used */
  model?: string;
  /** Language detected/used */
  language?: string;
  /** Token-level timing/confidence (async) */
  tokens?: AsyncTranscriptToken[];
}

/**
 * A single transcript entry
 */
export interface TranscriptEntry {
  /** Unique identifier */
  id: string;
  /** Transcribed text */
  text: string;
  /** When the transcript was created (ISO string) */
  createdAt: string;
  /** Duration of the recording in seconds */
  duration: number;
  /** Source of the transcript */
  source: TranscriptSource;
  /** Additional metadata */
  metadata?: TranscriptMetadata;
  /** All versions for this entry (includes original) */
  versions?: TranscriptVersion[];
  /** Active version ID */
  activeVersionId?: string;
}

/**
 * Create a new transcript entry
 */
export function createTranscriptEntry(
  text: string,
  source: TranscriptSource,
  duration: number,
  metadata?: TranscriptMetadata
): TranscriptEntry {
  const createdAt = new Date().toISOString();
  const version = createTranscriptVersion({
    text,
    createdAt,
    source: 'original',
    engine: metadata?.engine,
    model: metadata?.model,
    language: metadata?.language,
  });

  return {
    id: generateTranscriptId(),
    text,
    createdAt,
    duration,
    source,
    metadata,
    versions: [version],
    activeVersionId: version.id,
  };
}

/**
 * Generate a unique transcript ID
 */
export function generateTranscriptId(): string {
  return `transcript-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a transcript version
 */
export function createTranscriptVersion(input: Omit<TranscriptVersion, 'id'>): TranscriptVersion {
  return {
    id: `version-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...input,
  };
}

/**
 * Ensure an entry has version metadata (backwards compatibility)
 */
export function normalizeTranscriptEntry(entry: TranscriptEntry): TranscriptEntry {
  if (entry.versions && entry.versions.length > 0) {
    return entry;
  }

  const version = createTranscriptVersion({
    text: entry.text,
    createdAt: entry.createdAt,
    source: 'original',
    engine: entry.metadata?.engine,
    model: entry.metadata?.model,
    language: entry.metadata?.language,
  });

  return {
    ...entry,
    versions: [version],
    activeVersionId: version.id,
  };
}

/**
 * Get active version for display
 */
export function getActiveTranscriptVersion(entry: TranscriptEntry): TranscriptVersion | null {
  const versions = entry.versions ?? [];
  if (!versions.length) return null;
  if (entry.activeVersionId) {
    const active = versions.find((v) => v.id === entry.activeVersionId);
    if (active) return active;
  }
  return versions[0] ?? null;
}

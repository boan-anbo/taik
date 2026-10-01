/**
 * UI DOM Component Types
 * Type definitions for React DOM components
 */

import type { TranscriptDisplayState } from '@taik/domain';

/**
 * TranscriptDisplay component props
 */
export interface TranscriptDisplayProps {
  /** Display state containing final and partial segments */
  displayState: TranscriptDisplayState;
  /** Confidence threshold for "confirmed" styling (0-1, default 0.8) */
  confidenceThreshold?: number;
  /** Show word-level confidence coloring */
  showConfidence?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * TranscriptionTestPanel component props
 */
export interface TranscriptionTestPanelProps {
  /** Transcription mode */
  mode: 'realtime' | 'async';
  /** Audio data to transcribe */
  audioData: ArrayBuffer | null;
  /** File name for async mode */
  fileName?: string;
  /** Soniox API key */
  apiKey: string;
  /** Language hints */
  languageHints?: string[];
  /** Auto-start when audioData is provided */
  autoStart?: boolean;
  /** Callback when transcription completes */
  onComplete?: (text: string) => void;
}

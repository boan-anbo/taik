/**
 * Transcript Display Component
 * Provider-agnostic transcript visualization with word-level confidence coloring
 */

import { useMemo } from 'react';
import { tokens } from '@taik/ui-tokens';
import type {
  TranscriptDisplayState,
  TranscriptResult,
  TranscriptWord,
} from '@taik/domain';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '@taik/domain';

interface TranscriptDisplayProps {
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
 * Renders words with confidence-based styling
 */
function WordsWithConfidence({
  words,
  threshold,
  isFinal,
}: {
  words: TranscriptWord[];
  threshold: number;
  isFinal: boolean;
}) {
  return (
    <>
      {words.map((word, idx) => {
        const isConfident = word.confidence >= threshold;
        return (
          <span
            key={`${word.startMs}-${idx}`}
            style={{
              color: isConfident ? tokens.color.text : tokens.color.textSubtle,
              opacity: isFinal ? (isConfident ? 1 : 0.85) : 0.7,
            }}
            title={`Confidence: ${(word.confidence * 100).toFixed(0)}%`}
          >
            {word.text}
            {idx < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
}

/**
 * Renders a single transcript segment
 */
function SegmentDisplay({
  segment,
  isFinal,
  showConfidence,
  confidenceThreshold,
}: {
  segment: TranscriptResult;
  isFinal: boolean;
  showConfidence: boolean;
  confidenceThreshold: number;
}) {
  // If we have word-level data and confidence display is enabled, show words
  if (showConfidence && segment.words && segment.words.length > 0) {
    return (
      <WordsWithConfidence
        words={segment.words}
        threshold={confidenceThreshold}
        isFinal={isFinal}
      />
    );
  }

  // Fallback to plain text
  return (
    <span
      style={{
        color: isFinal ? tokens.color.text : tokens.color.textSubtle,
        fontStyle: isFinal ? 'normal' : 'italic',
        opacity: isFinal ? 1 : 0.7,
      }}
    >
      {segment.text}
    </span>
  );
}

/**
 * Main transcript display component
 * Renders finalized text with optional confidence coloring
 * and partial/interim text in a distinct style
 */
export function TranscriptDisplay({
  displayState,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  showConfidence = true,
  emptyMessage = 'Your transcription will appear here...',
}: TranscriptDisplayProps) {
  const { finalSegments, partialSegment, fullText } = displayState;

  const hasContent = fullText.length > 0 || partialSegment?.text;

  // Compute if we should use word-level display
  // Only use it if showConfidence is true and we have word data
  const useWordLevel: boolean = useMemo(() => {
    if (!showConfidence) return false;
    const hasWordData = finalSegments.some((s) => s.words && s.words.length > 0);
    const partialHasWords = !!(partialSegment?.words && partialSegment.words.length > 0);
    return hasWordData || partialHasWords;
  }, [showConfidence, finalSegments, partialSegment]);

  if (!hasContent) {
    return (
      <p
        style={{
          color: tokens.color.textSubtle,
          textAlign: 'center',
          marginTop: 40,
        }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      style={{
        fontSize: tokens.fontSize.lg,
        lineHeight: 1.6,
      }}
    >
      {/* Final segments */}
      {finalSegments.map((segment, idx) => (
        <span key={segment.finalAudioProcMs || idx}>
          <SegmentDisplay
            segment={segment}
            isFinal={true}
            showConfidence={useWordLevel}
            confidenceThreshold={confidenceThreshold}
          />
          {/* Add space between segments */}
          {idx < finalSegments.length - 1 || partialSegment ? ' ' : ''}
        </span>
      ))}

      {/* Partial/interim segment */}
      {partialSegment && partialSegment.text && (
        <span
          style={{
            fontStyle: 'italic',
          }}
        >
          <SegmentDisplay
            segment={partialSegment}
            isFinal={false}
            showConfidence={useWordLevel}
            confidenceThreshold={confidenceThreshold}
          />
        </span>
      )}
    </div>
  );
}

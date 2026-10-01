import type { Meta, StoryObj } from '@storybook/react';
import { TranscriptDisplay } from '@taik/ui-dom';
import { createTranscriptDisplayState, type TranscriptResult } from '@taik/domain';
import { tokens } from '@taik/ui-tokens';

/**
 * TranscriptDisplay renders speech-to-text transcription with visual feedback
 * for partial (interim) vs final text, and optional word-level confidence coloring.
 */
const meta: Meta<typeof TranscriptDisplay> = {
  title: 'Components/TranscriptDisplay',
  component: TranscriptDisplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    confidenceThreshold: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'Threshold (0-1) for "confident" word styling',
    },
    showConfidence: {
      control: 'boolean',
      description: 'Enable word-level confidence visualization',
    },
    emptyMessage: {
      control: 'text',
      description: 'Message shown when no transcript content',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          backgroundColor: tokens.color.surface,
          padding: tokens.space.xl,
          borderRadius: tokens.radius.md,
          minHeight: 200,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create mock transcript results
const createMockResult = (
  text: string,
  isFinal: boolean,
  words?: Array<{ text: string; confidence: number }>
): TranscriptResult => ({
  text,
  isFinal,
  words: words?.map((w, idx) => ({
    text: w.text,
    confidence: w.confidence,
    startMs: idx * 500,
    endMs: (idx + 1) * 500,
  })) ?? [],
  finalAudioProcMs: isFinal ? Date.now() : 0,
  totalAudioProcMs: Date.now(),
});

// ========== Basic Stories ==========

export const Empty: Story = {
  args: {
    displayState: createTranscriptDisplayState([]),
    emptyMessage: 'Your transcription will appear here...',
  },
};

export const FinalOnly: Story = {
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult('Hello, this is a completed transcription.', true),
    ]),
  },
};

export const PartialOnly: Story = {
  args: {
    displayState: createTranscriptDisplayState(
      [],
      createMockResult('Speaking in progress...', false)
    ),
  },
};

export const FinalAndPartial: Story = {
  args: {
    displayState: createTranscriptDisplayState(
      [
        createMockResult('This sentence is finalized.', true),
        createMockResult('So is this one.', true),
      ],
      createMockResult('And this is still being spoken...', false)
    ),
  },
};

// ========== Word-Level Confidence Stories ==========

export const WithWordConfidence: Story = {
  name: 'Word-Level Confidence',
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult('Hello world from Taik', true, [
        { text: 'Hello', confidence: 0.95 },
        { text: 'world', confidence: 0.88 },
        { text: 'from', confidence: 0.72 },
        { text: 'Taik', confidence: 0.99 },
      ]),
    ]),
    showConfidence: true,
    confidenceThreshold: 0.8,
  },
};

export const MixedConfidence: Story = {
  name: 'Mixed Confidence Levels',
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult('The quick brown fox jumps over the lazy dog', true, [
        { text: 'The', confidence: 0.99 },
        { text: 'quick', confidence: 0.95 },
        { text: 'brown', confidence: 0.45 }, // Low confidence
        { text: 'fox', confidence: 0.92 },
        { text: 'jumps', confidence: 0.88 },
        { text: 'over', confidence: 0.55 }, // Low confidence
        { text: 'the', confidence: 0.99 },
        { text: 'lazy', confidence: 0.65 }, // Low confidence
        { text: 'dog', confidence: 0.97 },
      ]),
    ]),
    showConfidence: true,
    confidenceThreshold: 0.8,
  },
};

export const ConfidenceDisabled: Story = {
  name: 'Confidence Disabled',
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult('Hello world from Taik', true, [
        { text: 'Hello', confidence: 0.95 },
        { text: 'world', confidence: 0.48 },
        { text: 'from', confidence: 0.72 },
        { text: 'Taik', confidence: 0.99 },
      ]),
    ]),
    showConfidence: false,
  },
};

// ========== Realistic Scenarios ==========

export const LongTranscription: Story = {
  name: 'Long Transcription',
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult(
        'Welcome to Taik, your speech-to-text assistant.',
        true
      ),
      createMockResult(
        'This application uses advanced AI to transcribe your speech in real-time.',
        true
      ),
      createMockResult(
        'You can see how the text appears as you speak, with partial results shown in italics.',
        true
      ),
      createMockResult(
        'Once a segment is finalized, it becomes part of the permanent transcript.',
        true
      ),
    ]),
  },
};

export const LiveRecordingSimulation: Story = {
  name: 'Live Recording (Simulated)',
  args: {
    displayState: createTranscriptDisplayState(
      [
        createMockResult('Today we are going to discuss', true, [
          { text: 'Today', confidence: 0.98 },
          { text: 'we', confidence: 0.99 },
          { text: 'are', confidence: 0.97 },
          { text: 'going', confidence: 0.95 },
          { text: 'to', confidence: 0.99 },
          { text: 'discuss', confidence: 0.92 },
        ]),
        createMockResult('the importance of speech recognition', true, [
          { text: 'the', confidence: 0.99 },
          { text: 'importance', confidence: 0.88 },
          { text: 'of', confidence: 0.99 },
          { text: 'speech', confidence: 0.94 },
          { text: 'recognition', confidence: 0.87 },
        ]),
      ],
      createMockResult('technology in modern...', false, [
        { text: 'technology', confidence: 0.75 },
        { text: 'in', confidence: 0.90 },
        { text: 'modern...', confidence: 0.60 },
      ])
    ),
    showConfidence: true,
    confidenceThreshold: 0.8,
  },
};

// ========== Edge Cases ==========

export const CustomEmptyMessage: Story = {
  args: {
    displayState: createTranscriptDisplayState([]),
    emptyMessage: 'Tap the microphone to start recording',
  },
};

export const SingleWord: Story = {
  args: {
    displayState: createTranscriptDisplayState([
      createMockResult('Hello', true, [{ text: 'Hello', confidence: 0.99 }]),
    ]),
  },
};

// ========== All States Overview ==========

export const AllStates: Story = {
  name: 'All States Overview',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 8, fontSize: 14, color: tokens.color.textSubtle }}>
          Empty State
        </h3>
        <div
          style={{
            backgroundColor: tokens.color.background,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <TranscriptDisplay
            displayState={createTranscriptDisplayState([])}
            emptyMessage="Your transcription will appear here..."
          />
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8, fontSize: 14, color: tokens.color.textSubtle }}>
          Final Text Only
        </h3>
        <div
          style={{
            backgroundColor: tokens.color.background,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <TranscriptDisplay
            displayState={createTranscriptDisplayState([
              createMockResult('This is finalized text.', true),
            ])}
          />
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8, fontSize: 14, color: tokens.color.textSubtle }}>
          Partial Text Only (Listening)
        </h3>
        <div
          style={{
            backgroundColor: tokens.color.background,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <TranscriptDisplay
            displayState={createTranscriptDisplayState(
              [],
              createMockResult('Currently speaking...', false)
            )}
          />
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8, fontSize: 14, color: tokens.color.textSubtle }}>
          Mixed Final + Partial
        </h3>
        <div
          style={{
            backgroundColor: tokens.color.background,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <TranscriptDisplay
            displayState={createTranscriptDisplayState(
              [createMockResult('Finalized sentence.', true)],
              createMockResult('Still speaking...', false)
            )}
          />
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8, fontSize: 14, color: tokens.color.textSubtle }}>
          Word-Level Confidence
        </h3>
        <div
          style={{
            backgroundColor: tokens.color.background,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <TranscriptDisplay
            displayState={createTranscriptDisplayState([
              createMockResult('High and low confidence words', true, [
                { text: 'High', confidence: 0.95 },
                { text: 'and', confidence: 0.99 },
                { text: 'low', confidence: 0.55 },
                { text: 'confidence', confidence: 0.88 },
                { text: 'words', confidence: 0.45 },
              ]),
            ])}
            showConfidence={true}
            confidenceThreshold={0.8}
          />
        </div>
      </div>
    </div>
  ),
};

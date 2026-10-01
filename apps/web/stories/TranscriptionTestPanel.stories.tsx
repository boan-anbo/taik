/**
 * Transcription Test Panel Stories
 *
 * Side-by-side comparison of real-time (WebSocket streaming) vs async (REST API) transcription.
 * Uses test fixture audio and real Soniox API.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect, useCallback } from 'react';
import { TranscriptionTestPanel } from '@taik/ui-dom';
import { tokens } from '@taik/ui-tokens';

// API key from environment
const SONIOX_API_KEY = import.meta.env.VITE_SONIOX_API_KEY || '';

// Test audio fixture path (served via staticDirs in main.ts)
const TEST_AUDIO_URL = '/test-fixtures/audio/taik-test-audio.m4a';

/**
 * Load audio file as ArrayBuffer
 */
async function loadAudioFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Demo component for side-by-side comparison
 */
function SideBySideDemo() {
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startBoth, setStartBoth] = useState(false);

  // Load audio file
  const handleLoadAudio = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await loadAudioFile(TEST_AUDIO_URL);
      setAudioData(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load audio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start both panels
  const handleStartBoth = useCallback(() => {
    setStartBoth(true);
    // Reset after a tick to allow panels to pick up the change
    setTimeout(() => setStartBoth(false), 100);
  }, []);

  // Check for API key
  if (!SONIOX_API_KEY) {
    return (
      <div
        style={{
          padding: tokens.space.xxl,
          textAlign: 'center',
          color: tokens.color.danger,
        }}
      >
        <h2>Missing API Key</h2>
        <p>
          Please set <code>VITE_SONIOX_API_KEY</code> environment variable to test transcription.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: tokens.space.lg,
        gap: tokens.space.lg,
        backgroundColor: tokens.color.background,
      }}
    >
      {/* Header with controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: tokens.fontSize.xl,
            color: tokens.color.text,
          }}
        >
          Transcription Mode Comparison
        </h1>

        <div style={{ display: 'flex', gap: tokens.space.md }}>
          {!audioData && (
            <button
              onClick={handleLoadAudio}
              disabled={isLoading}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                backgroundColor: tokens.color.surface,
                color: tokens.color.text,
                border: `1px solid ${tokens.color.borderSubtle}`,
                borderRadius: tokens.radius.md,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.medium,
                cursor: isLoading ? 'wait' : 'pointer',
              }}
            >
              {isLoading ? 'Loading...' : 'Load Test Audio'}
            </button>
          )}

          {audioData && (
            <button
              onClick={handleStartBoth}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                backgroundColor: tokens.color.brand,
                color: 'white',
                border: 'none',
                borderRadius: tokens.radius.md,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              Start Both
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {loadError && (
        <div
          style={{
            padding: tokens.space.md,
            backgroundColor: tokens.color.dangerSurface,
            color: tokens.color.danger,
            borderRadius: tokens.radius.md,
          }}
        >
          {loadError}
        </div>
      )}

      {/* Audio info */}
      {audioData && (
        <div
          style={{
            padding: tokens.space.sm,
            backgroundColor: tokens.color.surface,
            borderRadius: tokens.radius.sm,
            fontSize: tokens.fontSize.sm,
            color: tokens.color.textSubtle,
          }}
        >
          Audio loaded: taik-test-audio.m4a ({(audioData.byteLength / 1024).toFixed(1)} KB)
        </div>
      )}

      {/* Side-by-side panels */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: tokens.space.lg,
          minHeight: 0,
        }}
      >
        <TranscriptionTestPanel
          mode="realtime"
          audioData={audioData}
          fileName="taik-test-audio.m4a"
          apiKey={SONIOX_API_KEY}
          languageHints={['en']}
          autoStart={startBoth}
        />
        <TranscriptionTestPanel
          mode="async"
          audioData={audioData}
          fileName="taik-test-audio.m4a"
          apiKey={SONIOX_API_KEY}
          languageHints={['en']}
          autoStart={startBoth}
        />
      </div>
    </div>
  );
}

/**
 * Single panel demo
 */
function SinglePanelDemo({ mode }: { mode: 'realtime' | 'async' }) {
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);

  const handleLoadAudio = useCallback(async () => {
    try {
      const data = await loadAudioFile(TEST_AUDIO_URL);
      setAudioData(data);
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  }, []);

  useEffect(() => {
    handleLoadAudio();
  }, [handleLoadAudio]);

  if (!SONIOX_API_KEY) {
    return (
      <div style={{ padding: tokens.space.xxl, textAlign: 'center', color: tokens.color.danger }}>
        Missing VITE_SONIOX_API_KEY
      </div>
    );
  }

  return (
    <div style={{ height: 400, padding: tokens.space.lg }}>
      <TranscriptionTestPanel
        mode={mode}
        audioData={audioData}
        fileName="taik-test-audio.m4a"
        apiKey={SONIOX_API_KEY}
        languageHints={['en']}
      />
    </div>
  );
}

// ============================================================================
// Storybook Meta
// ============================================================================

const meta: Meta<typeof TranscriptionTestPanel> = {
  title: 'Testing/TranscriptionTestPanel',
  component: TranscriptionTestPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Side-by-side comparison of real-time vs async transcription modes.
 * Click "Load Test Audio" then "Start Both" to test.
 */
export const SideBySide: Story = {
  render: () => <SideBySideDemo />,
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Real-time mode only - shows partial results as they stream in.
 */
export const RealtimeOnly: Story = {
  render: () => <SinglePanelDemo mode="realtime" />,
};

/**
 * Async mode only - shows progress bar and final result.
 */
export const AsyncOnly: Story = {
  render: () => <SinglePanelDemo mode="async" />,
};

import { describe, expect, it, vi } from 'vitest';
import { SonioxSession } from '../core/session.js';
import type { TranscriptResult } from '../types/events.js';

describe('SonioxSession.stop', () => {
  it('waits for finalization window but does not promote partial to final', async () => {
    vi.useFakeTimers();
    try {
      const session = new SonioxSession({
        apiKey: 'test',
        finalizeTimeoutMs: 1200,
        finalizeMinWaitMs: 500,
        logging: { level: 'silent' },
      });

      const transcripts: TranscriptResult[] = [];
      session.on('transcript', (r) => transcripts.push(r));

      // Force into an "active" state with a ready transport that never emits "finished".
      (session as any).state = 'active';
      (session as any).audioSource = null;
      (session as any).transport = {
        isReady: () => true,
        sendFinalize: () => {},
        once: (_: string, __: () => void) => {},
        disconnect: () => {},
        removeAllListeners: () => {},
      };

      (session as any).lastTranscriptAt = Date.now();
      (session as any).lastTranscriptWasPartial = true;
      (session as any).maxFinalTokenEndMs = 900;
      (session as any).lastPartialResult = {
        text: ' last words',
        isFinal: false,
        words: [
          { text: ' last', startMs: 900, endMs: 950, confidence: 1 },
          { text: ' words', startMs: 950, endMs: 1000, confidence: 1 },
        ],
        detectedLanguage: 'en',
        sourceLanguage: 'en',
        finalAudioProcMs: 0,
        totalAudioProcMs: 0,
      };
      (session as any).lastPartialEndMs = 1000;

      const stopPromise = session.stop();
      // strict finalize waiting: will resolve on finalizeTimeoutMs when partial never clears
      await vi.advanceTimersByTimeAsync(1400);
      await stopPromise;

      const promoted = transcripts.find((t) => t.isFinal && t.text.includes('last words'));
      expect(promoted).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });
});

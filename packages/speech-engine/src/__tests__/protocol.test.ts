/**
 * Tests for protocol message building and parsing
 */

import { describe, it, expect } from 'vitest';
import {
  buildConfigMessage,
  isFinishedMessage,
  isErrorMessage,
} from '../types/protocol.js';
import type { ProtocolTranscriptMessage } from '../types/protocol.js';

describe('Protocol', () => {
  describe('buildConfigMessage', () => {
    it('should build minimal config message', () => {
      const msg = buildConfigMessage('test-api-key', 'stt-rt-preview', 'auto');

      expect(msg.api_key).toBe('test-api-key');
      expect(msg.model).toBe('stt-rt-preview');
      expect(msg.audio_format).toBe('auto');
      expect(msg.sample_rate).toBeUndefined();
      expect(msg.num_channels).toBeUndefined();
    });

    it('should include sample rate and channels for raw audio', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'pcm_s16le',
        16000,
        1
      );

      expect(msg.audio_format).toBe('pcm_s16le');
      expect(msg.sample_rate).toBe(16000);
      expect(msg.num_channels).toBe(1);
    });

    it('should include language hints', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        { languageHints: ['en', 'es'] }
      );

      expect(msg.language_hints).toEqual(['en', 'es']);
    });

    it('should include speaker diarization flag', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        { enableSpeakerDiarization: true }
      );

      expect(msg.enable_speaker_diarization).toBe(true);
    });

    it('should include language identification flag', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        { enableLanguageIdentification: true }
      );

      expect(msg.enable_language_identification).toBe(true);
    });

    it('should include context', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        {
          context: {
            general: [{ key: 'domain', value: 'medical' }],
            terms: ['aspirin', 'ibuprofen'],
            text: 'Patient consultation',
          },
        }
      );

      expect(msg.context?.general).toEqual([{ key: 'domain', value: 'medical' }]);
      expect(msg.context?.terms).toEqual(['aspirin', 'ibuprofen']);
      expect(msg.context?.text).toBe('Patient consultation');
    });

    it('should include one-way translation config', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        {
          translation: {
            type: 'one_way',
            targetLanguage: 'es',
          },
        }
      );

      expect(msg.translation?.type).toBe('one_way');
      expect(msg.translation?.target_language).toBe('es');
    });

    it('should include two-way translation config', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        {
          translation: {
            type: 'two_way',
            languageA: 'en',
            languageB: 'es',
          },
        }
      );

      expect(msg.translation?.type).toBe('two_way');
      expect(msg.translation?.language_a).toBe('en');
      expect(msg.translation?.language_b).toBe('es');
    });

    it('should include client reference id', () => {
      const msg = buildConfigMessage(
        'test-api-key',
        'stt-rt-preview',
        'auto',
        undefined,
        undefined,
        undefined,
        'my-ref-123'
      );

      expect(msg.client_reference_id).toBe('my-ref-123');
    });
  });

  describe('isFinishedMessage', () => {
    it('should return true for finished message', () => {
      const msg: ProtocolTranscriptMessage = {
        tokens: [],
        final_audio_proc_ms: 1000,
        total_audio_proc_ms: 1000,
        finished: true,
      };

      expect(isFinishedMessage(msg)).toBe(true);
    });

    it('should return false for non-finished message', () => {
      const msg: ProtocolTranscriptMessage = {
        tokens: [{ text: 'hello', confidence: 0.9, is_final: false }],
        final_audio_proc_ms: 500,
        total_audio_proc_ms: 1000,
      };

      expect(isFinishedMessage(msg)).toBe(false);
    });
  });

  describe('isErrorMessage', () => {
    it('should return true for error message', () => {
      const msg: ProtocolTranscriptMessage = {
        tokens: [],
        final_audio_proc_ms: 0,
        total_audio_proc_ms: 0,
        error_code: 401,
        error_message: 'Unauthorized',
      };

      expect(isErrorMessage(msg)).toBe(true);
    });

    it('should return false for non-error message', () => {
      const msg: ProtocolTranscriptMessage = {
        tokens: [{ text: 'hello', confidence: 0.9, is_final: true }],
        final_audio_proc_ms: 1000,
        total_audio_proc_ms: 1000,
      };

      expect(isErrorMessage(msg)).toBe(false);
    });
  });
});

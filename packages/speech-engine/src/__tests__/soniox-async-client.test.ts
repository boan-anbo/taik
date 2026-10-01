/**
 * Tests for Soniox Async Transcription Client
 *
 * Focus: MIME type handling for various audio formats including M4A
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SonioxAsyncClient } from '../async/soniox-async-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SonioxAsyncClient', () => {
  let client: SonioxAsyncClient;

  beforeEach(() => {
    client = new SonioxAsyncClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.soniox.com/v1',
    });

    // Reset mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    // Helper to capture FormData from fetch call
    const captureFormData = (): FormData | null => {
      if (mockFetch.mock.calls.length === 0) return null;
      const call = mockFetch.mock.calls[0];
      return call[1]?.body as FormData;
    };

    // Helper to get the Blob from FormData
    const getBlobFromFormData = (formData: FormData): Blob | null => {
      const file = formData.get('file');
      if (file instanceof Blob) return file;
      return null;
    };

    beforeEach(() => {
      // Setup successful upload response (API returns 'id', not 'file_id')
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'test-file-id', filename: 'test.mp3' }),
      });
    });

    it('should upload file with correct authorization header', async () => {
      const fileData = new ArrayBuffer(100);

      await client.uploadFile(fileData, 'test.mp3');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.soniox.com/v1/files');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer test-api-key');
    });

    it('should return file id from response', async () => {
      const fileData = new ArrayBuffer(100);

      const fileId = await client.uploadFile(fileData, 'test.mp3');

      expect(fileId).toBe('test-file-id');
    });

    // CRITICAL: Test MIME type handling
    describe('MIME type handling', () => {
      it('should create Blob from ArrayBuffer with correct MIME type for M4A', async () => {
        const fileData = new ArrayBuffer(100);

        await client.uploadFile(fileData, 'voice_memo.m4a');

        const formData = captureFormData();
        const blob = getBlobFromFormData(formData!);

        expect(blob).not.toBeNull();
        // Fixed: M4A files now have proper MIME type
        expect(blob?.type).toBe('audio/mp4');
      });

      it('should preserve MIME type when Blob is passed directly', async () => {
        const blob = new Blob([new ArrayBuffer(100)], { type: 'audio/mp4' });

        await client.uploadFile(blob, 'voice_memo.m4a');

        const formData = captureFormData();
        const uploadedBlob = getBlobFromFormData(formData!);

        expect(uploadedBlob).not.toBeNull();
        // When Blob is passed directly, MIME type should be preserved
        expect(uploadedBlob?.type).toBe('audio/mp4');
      });

      // Tests for MIME types by extension
      describe('MIME types by extension', () => {
        const mimeTypeTests = [
          { extension: 'm4a', expectedMimeType: 'audio/mp4', description: 'M4A (Apple Voice Memo)' },
          { extension: 'mp3', expectedMimeType: 'audio/mpeg', description: 'MP3' },
          { extension: 'wav', expectedMimeType: 'audio/wav', description: 'WAV' },
          { extension: 'flac', expectedMimeType: 'audio/flac', description: 'FLAC' },
          { extension: 'ogg', expectedMimeType: 'audio/ogg', description: 'OGG' },
          { extension: 'webm', expectedMimeType: 'audio/webm', description: 'WebM' },
          { extension: 'mp4', expectedMimeType: 'video/mp4', description: 'MP4 video' },
          { extension: 'aac', expectedMimeType: 'audio/aac', description: 'AAC' },
        ];

        for (const { extension, expectedMimeType, description } of mimeTypeTests) {
          it(`should set MIME type to ${expectedMimeType} for ${description} files`, async () => {
            const fileData = new ArrayBuffer(100);

            await client.uploadFile(fileData, `recording.${extension}`);

            const formData = captureFormData();
            const blob = getBlobFromFormData(formData!);

            expect(blob).not.toBeNull();
            expect(blob?.type).toBe(expectedMimeType);
          });
        }
      });

      it('should handle unknown extensions gracefully', async () => {
        const fileData = new ArrayBuffer(100);

        await client.uploadFile(fileData, 'recording.xyz');

        const formData = captureFormData();
        const blob = getBlobFromFormData(formData!);

        expect(blob).not.toBeNull();
        // Unknown extension should result in empty MIME type (let server decide)
        expect(blob?.type).toBe('');
      });

      it('should handle files without extension', async () => {
        const fileData = new ArrayBuffer(100);

        await client.uploadFile(fileData, 'recording');

        const formData = captureFormData();
        const blob = getBlobFromFormData(formData!);

        expect(blob).not.toBeNull();
        expect(blob?.type).toBe('');
      });

      it('should handle case-insensitive extensions', async () => {
        const fileData = new ArrayBuffer(100);

        await client.uploadFile(fileData, 'recording.M4A');

        const formData = captureFormData();
        const blob = getBlobFromFormData(formData!);

        expect(blob).not.toBeNull();
        expect(blob?.type).toBe('audio/mp4');
      });
    });

    describe('error handling', () => {
      it('should throw AsyncTranscriptionError on API error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({
            message: 'Invalid file format',
            error_type: 'invalid_format',
            status_code: 400,
          }),
        });

        const fileData = new ArrayBuffer(100);

        await expect(client.uploadFile(fileData, 'test.xyz')).rejects.toThrow(
          'Invalid file format'
        );
      });

      it('should throw AsyncTranscriptionError on 401 Unauthorized', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({
            message: 'Invalid API key',
            error_type: 'unauthorized',
            status_code: 401,
          }),
        });

        const fileData = new ArrayBuffer(100);

        await expect(client.uploadFile(fileData, 'test.mp3')).rejects.toThrow(
          'Invalid API key'
        );
      });
    });
  });

  describe('createTranscription', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'transcription-123',
          status: 'queued',
          model: 'stt-async-preview',
        }),
      });
    });

    it('should require either audioUrl or fileId', async () => {
      await expect(client.createTranscription({})).rejects.toThrow(
        'Either audioUrl or fileId must be provided'
      );
    });

    it('should create transcription with fileId', async () => {
      const result = await client.createTranscription({
        fileId: 'file-123',
      });

      expect(result.id).toBe('transcription-123');
      expect(result.status).toBe('queued');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.file_id).toBe('file-123');
    });

    it('should create transcription with audioUrl', async () => {
      await client.createTranscription({
        audioUrl: 'https://example.com/audio.mp3',
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.audio_url).toBe('https://example.com/audio.mp3');
    });

    it('should include language hints', async () => {
      await client.createTranscription({
        fileId: 'file-123',
        languageHints: ['en', 'zh'],
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.language_hints).toEqual(['en', 'zh']);
    });

    it('should include speaker diarization option', async () => {
      await client.createTranscription({
        fileId: 'file-123',
        enableSpeakerDiarization: true,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.enable_speaker_diarization).toBe(true);
    });
  });

  describe('getTranscription', () => {
    it('should fetch transcription by ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'transcription-123',
          status: 'completed',
          audio_duration_ms: 5000,
        }),
      });

      const result = await client.getTranscription('transcription-123');

      expect(result.id).toBe('transcription-123');
      expect(result.status).toBe('completed');
      expect(result.audioDurationMs).toBe(5000);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.soniox.com/v1/transcriptions/transcription-123');
    });
  });

  describe('getTranscript', () => {
    it('should fetch transcript for completed transcription', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          text: 'Hello, world!',
          tokens: [
            { text: 'Hello', confidence: 0.99, is_final: true },
            { text: ',', confidence: 0.99, is_final: true },
            { text: ' ', confidence: 0.99, is_final: true },
            { text: 'world', confidence: 0.98, is_final: true },
            { text: '!', confidence: 0.99, is_final: true },
          ],
        }),
      });

      const result = await client.getTranscript('transcription-123');

      expect(result.text).toBe('Hello, world!');
      expect(result.tokens).toHaveLength(5);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.soniox.com/v1/transcriptions/transcription-123/transcript');
    });
  });

  describe('transcribeFile (integration)', () => {
    it('should upload, create transcription, and poll for completion', async () => {
      // Mock sequence: upload -> create -> poll (processing) -> poll (completed) -> transcript
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'file-123', filename: 'recording.m4a' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'trans-123',
            status: 'queued',
            model: 'stt-async-preview',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'trans-123',
            status: 'processing',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'trans-123',
            status: 'completed',
            audio_duration_ms: 3000,
            model: 'stt-async-preview',
            filename: 'recording.m4a',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Test transcription',
            tokens: [{ text: 'Test', confidence: 0.99, is_final: true }],
          }),
        });

      // Create client with short polling interval for testing
      const fastClient = new SonioxAsyncClient({
        apiKey: 'test-api-key',
        baseUrl: 'https://api.soniox.com/v1',
        pollingIntervalMs: 10,
      });

      const progressUpdates: Array<{ status: string; progress: number }> = [];
      const result = await fastClient.transcribeFile(
        new ArrayBuffer(100),
        'recording.m4a',
        { languageHints: ['en'] },
        (progress) => progressUpdates.push({ status: progress.status, progress: progress.progress })
      );

      expect(result.text).toBe('Test transcription');
      expect(result.audioDurationMs).toBe(3000);
      expect(result.filename).toBe('recording.m4a');

      // Verify progress updates were received
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
    });
  });
});

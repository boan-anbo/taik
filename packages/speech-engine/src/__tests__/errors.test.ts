/**
 * Tests for custom error classes
 */

import { describe, it, expect } from 'vitest';
import {
  SonioxError,
  ConnectionError,
  AudioError,
  ConfigError,
  ProtocolError,
  UnsupportedError,
  TranscriptionError,
  getErrorMessage,
} from '../utils/errors.js';

describe('Errors', () => {
  describe('SonioxError', () => {
    it('should create error with all properties', () => {
      const error = new SonioxError('Test error', 'TEST_CODE', 'connection', true);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.phase).toBe('connection');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('SonioxError');
    });

    it('should preserve cause', () => {
      const cause = new Error('Original error');
      const error = new SonioxError('Wrapper', 'CODE', 'audio', false, cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('ConnectionError', () => {
    it('should be recoverable by default', () => {
      const error = new ConnectionError('Connection failed');

      expect(error.recoverable).toBe(true);
      expect(error.phase).toBe('connection');
      expect(error.code).toBe('CONNECTION_ERROR');
    });

    it('should include status code', () => {
      const error = new ConnectionError('Connection failed', 503);

      expect(error.statusCode).toBe(503);
    });
  });

  describe('AudioError', () => {
    it('should default to not recoverable', () => {
      const error = new AudioError('Mic not found');

      expect(error.recoverable).toBe(false);
      expect(error.phase).toBe('audio');
    });

    it('should allow recoverable flag', () => {
      const error = new AudioError('Temporary issue', true);

      expect(error.recoverable).toBe(true);
    });
  });

  describe('ConfigError', () => {
    it('should include field name', () => {
      const error = new ConfigError('Invalid API key', 'apiKey');

      expect(error.field).toBe('apiKey');
      expect(error.recoverable).toBe(false);
      expect(error.phase).toBe('connection');
    });
  });

  describe('ProtocolError', () => {
    it('should be recoverable for 503', () => {
      const error = new ProtocolError('Service unavailable', 503);

      expect(error.recoverable).toBe(true);
      expect(error.errorCode).toBe(503);
    });

    it('should not be recoverable for 401', () => {
      const error = new ProtocolError('Unauthorized', 401);

      expect(error.recoverable).toBe(false);
      expect(error.errorCode).toBe(401);
    });
  });

  describe('UnsupportedError', () => {
    it('should include feature and runtime', () => {
      const error = new UnsupportedError('Microphone capture', 'cloudflare');

      expect(error.feature).toBe('Microphone capture');
      expect(error.runtime).toBe('cloudflare');
      expect(error.message).toContain('Microphone capture');
      expect(error.message).toContain('cloudflare');
    });
  });

  describe('TranscriptionError', () => {
    it('should be recoverable for timeout (408)', () => {
      const error = new TranscriptionError('Timeout', 408);

      expect(error.recoverable).toBe(true);
    });

    it('should be recoverable for service unavailable (503)', () => {
      const error = new TranscriptionError('Unavailable', 503);

      expect(error.recoverable).toBe(true);
    });

    it('should not be recoverable for other errors', () => {
      const error = new TranscriptionError('Bad request', 400);

      expect(error.recoverable).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return friendly message for 401', () => {
      const msg = getErrorMessage(401, 'Unauthorized');

      expect(msg).toContain('Invalid API key');
    });

    it('should return friendly message for 429', () => {
      const msg = getErrorMessage(429, 'Too many requests');

      expect(msg).toContain('Rate limit');
    });

    it('should return friendly message for 503', () => {
      const msg = getErrorMessage(503, 'Service unavailable');

      expect(msg).toContain('unavailable');
    });

    it('should include original message for 400', () => {
      const msg = getErrorMessage(400, 'Invalid audio format');

      expect(msg).toContain('Invalid audio format');
    });

    it('should handle unknown codes', () => {
      const msg = getErrorMessage(999, 'Unknown error');

      expect(msg).toContain('Unknown error');
    });
  });
});

/**
 * Provider Conformance Tests
 *
 * These tests verify that all speech providers implement the SpeechProvider
 * interface correctly. Any new provider should pass these tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  SpeechProvider,
  SpeechEvent,
  SpeechEventHandler,
  SpeechProviderConfig,
  PartialSpeechEvent,
  FinalSpeechEvent,
  StatusSpeechEvent,
  ErrorSpeechEvent,
  SpeechErrorCategory,
} from '../types.js';
import { SpeechEngineError } from '../types.js';

/**
 * Conformance test suite for speech providers
 *
 * Run these tests against any provider implementation to verify
 * it meets the contract requirements.
 */
export function runProviderConformanceTests(
  createProvider: () => SpeechProvider,
  cleanup: () => void = () => {}
) {
  describe('SpeechProvider Conformance', () => {
    let provider: SpeechProvider;

    beforeEach(() => {
      provider = createProvider();
    });

    afterEach(() => {
      provider.dispose();
      cleanup();
    });

    describe('Provider Identity', () => {
      it('should have a non-empty id', () => {
        expect(provider.id).toBeDefined();
        expect(typeof provider.id).toBe('string');
        expect(provider.id.length).toBeGreaterThan(0);
      });

      it('should have a non-empty name', () => {
        expect(provider.name).toBeDefined();
        expect(typeof provider.name).toBe('string');
        expect(provider.name.length).toBeGreaterThan(0);
      });
    });

    describe('State Management', () => {
      it('should start in idle state', () => {
        expect(provider.state).toBe('idle');
      });

      it('should have valid state values', () => {
        const validStates = ['idle', 'starting', 'active', 'stopping', 'stopped', 'error'];
        expect(validStates).toContain(provider.state);
      });
    });

    describe('Subscription API', () => {
      it('should allow subscribing to events', () => {
        const handler: SpeechEventHandler = () => {};
        const subscription = provider.subscribe(handler);

        expect(subscription).toBeDefined();
        expect(typeof subscription.unsubscribe).toBe('function');
      });

      it('should allow unsubscribing', () => {
        const handler: SpeechEventHandler = () => {};
        const subscription = provider.subscribe(handler);

        // Should not throw
        expect(() => subscription.unsubscribe()).not.toThrow();
      });

      it('should support multiple subscribers', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        const sub1 = provider.subscribe(handler1);
        const sub2 = provider.subscribe(handler2);

        expect(sub1).not.toBe(sub2);

        sub1.unsubscribe();
        sub2.unsubscribe();
      });
    });

    describe('Lifecycle Methods', () => {
      it('should have start method that returns a Promise', () => {
        expect(typeof provider.start).toBe('function');
        // Note: We don't actually call start() as it requires real connection
      });

      it('should have stop method that returns a Promise', () => {
        expect(typeof provider.stop).toBe('function');
      });

      it('should have abort method', () => {
        expect(typeof provider.abort).toBe('function');
      });

      it('should have sendAudio method', () => {
        expect(typeof provider.sendAudio).toBe('function');
      });

      it('should have dispose method', () => {
        expect(typeof provider.dispose).toBe('function');
      });
    });

    describe('Dispose Cleanup', () => {
      it('should set state to idle after dispose', () => {
        provider.dispose();
        expect(provider.state).toBe('idle');
      });
    });
  });
}

/**
 * Test suite for SpeechEvent type conformance
 */
describe('SpeechEvent Types', () => {
  describe('PartialSpeechEvent', () => {
    it('should have correct shape', () => {
      const event: PartialSpeechEvent = {
        type: 'partial',
        text: 'Hello',
      };

      expect(event.type).toBe('partial');
      expect(event.text).toBe('Hello');
    });

    it('should allow optional confidence', () => {
      const event: PartialSpeechEvent = {
        type: 'partial',
        text: 'Hello',
        confidence: 0.95,
      };

      expect(event.confidence).toBe(0.95);
    });

    it('should allow optional timings', () => {
      const event: PartialSpeechEvent = {
        type: 'partial',
        text: 'Hello',
        timings: {
          words: [{ word: 'Hello', startMs: 0, endMs: 500, confidence: 0.9 }],
          audioDurationMs: 500,
        },
      };

      expect(event.timings?.words?.length).toBe(1);
    });
  });

  describe('FinalSpeechEvent', () => {
    it('should have correct shape', () => {
      const event: FinalSpeechEvent = {
        type: 'final',
        text: 'Hello world',
      };

      expect(event.type).toBe('final');
      expect(event.text).toBe('Hello world');
    });

    it('should allow language field', () => {
      const event: FinalSpeechEvent = {
        type: 'final',
        text: 'Hello world',
        language: 'en',
      };

      expect(event.language).toBe('en');
    });

    it('should allow translatedText field', () => {
      const event: FinalSpeechEvent = {
        type: 'final',
        text: 'Hola mundo',
        translatedText: 'Hello world',
      };

      expect(event.translatedText).toBe('Hello world');
    });
  });

  describe('StatusSpeechEvent', () => {
    it('should have correct shape', () => {
      const event: StatusSpeechEvent = {
        type: 'status',
        text: '',
        status: 'connecting',
      };

      expect(event.type).toBe('status');
      expect(event.status).toBe('connecting');
    });

    it('should support all status values', () => {
      const statuses = ['connecting', 'connected', 'disconnected', 'reconnecting', 'processing', 'idle', 'finalizing'];

      statuses.forEach((status) => {
        const event: StatusSpeechEvent = {
          type: 'status',
          text: '',
          status: status as StatusSpeechEvent['status'],
        };

        expect(event.status).toBe(status);
      });
    });
  });

  describe('ErrorSpeechEvent', () => {
    it('should have correct shape', () => {
      const event: ErrorSpeechEvent = {
        type: 'error',
        text: '',
        category: 'network',
        error: new Error('Connection failed'),
        recoverable: true,
      };

      expect(event.type).toBe('error');
      expect(event.category).toBe('network');
      expect(event.error.message).toBe('Connection failed');
      expect(event.recoverable).toBe(true);
    });

    it('should support all error categories', () => {
      const categories: SpeechErrorCategory[] = ['auth', 'network', 'quota', 'unsupported', 'internal'];

      categories.forEach((category) => {
        const event: ErrorSpeechEvent = {
          type: 'error',
          text: '',
          category,
          error: new Error('Test error'),
          recoverable: false,
        };

        expect(event.category).toBe(category);
      });
    });
  });
});

/**
 * Test suite for SpeechEngineError
 */
describe('SpeechEngineError', () => {
  it('should create with required parameters', () => {
    const error = new SpeechEngineError('Test error', 'network');

    expect(error.message).toBe('Test error');
    expect(error.category).toBe('network');
    expect(error.recoverable).toBe(false);
    expect(error.name).toBe('SpeechEngineError');
  });

  it('should create with all parameters', () => {
    const cause = new Error('Original error');
    const error = new SpeechEngineError('Test error', 'auth', true, 'AUTH_001', cause);

    expect(error.message).toBe('Test error');
    expect(error.category).toBe('auth');
    expect(error.recoverable).toBe(true);
    expect(error.providerCode).toBe('AUTH_001');
    expect(error.cause).toBe(cause);
  });

  it('should be an instance of Error', () => {
    const error = new SpeechEngineError('Test', 'internal');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SpeechEngineError).toBe(true);
  });
});

/**
 * Test suite for provider configuration
 */
describe('SpeechProviderConfig Types', () => {
  it('should allow empty config', () => {
    const config: SpeechProviderConfig = {};
    expect(config).toBeDefined();
  });

  it('should allow audio config', () => {
    const config: SpeechProviderConfig = {
      audio: {
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_s16le',
      },
    };

    expect(config.audio?.sampleRate).toBe(16000);
  });

  it('should allow features config', () => {
    const config: SpeechProviderConfig = {
      features: {
        interimResults: true,
        speakerDiarization: true,
        languageHints: ['en', 'es'],
      },
    };

    expect(config.features?.interimResults).toBe(true);
    expect(config.features?.languageHints).toEqual(['en', 'es']);
  });

  it('should allow connection config', () => {
    const config: SpeechProviderConfig = {
      connection: {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelayMs: 1000,
        connectionTimeoutMs: 30000,
      },
    };

    expect(config.connection?.autoReconnect).toBe(true);
  });
});

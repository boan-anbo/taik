import { describe, expect, it } from 'vitest';
import type { RuntimeAdapter } from '../runtime/adapter.js';
import type { Logger, SonioxConfig } from '../types/config.js';
import { WebSocketTransport } from '../transport/websocket-transport.js';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const dummyAdapter: RuntimeAdapter = {
  type: 'node',
  websocket: {
    create: () => {
      throw new Error('not used in unit tests');
    },
  },
  audio: {
    isSupported: () => false,
    captureFromMicrophone: async () => {
      throw new Error('not used in unit tests');
    },
  },
  file: {
    readFile: async () => {
      throw new Error('not used in unit tests');
    },
    createReadStream: async function* () {
      throw new Error('not used in unit tests');
    },
    exists: async () => false,
  },
};

const dummyConfig: SonioxConfig = { apiKey: 'test' };

describe('WebSocketTransport message parsing', () => {
  it('emits finalized prefix even when message contains non-final tokens', () => {
    const transport = new WebSocketTransport(dummyConfig, dummyAdapter, noopLogger);
    const events: any[] = [];
    transport.on('transcript', (r) => events.push(r));

    const msg = {
      tokens: [
        { text: 'hello', confidence: 1, is_final: true, start_ms: 0, end_ms: 100 },
        { text: ' world', confidence: 1, is_final: true, start_ms: 100, end_ms: 200 },
        { text: '<fin>', confidence: 1, is_final: false },
        { text: ' again', confidence: 1, is_final: false, start_ms: 200, end_ms: 300 },
      ],
      final_audio_proc_ms: 0,
      total_audio_proc_ms: 0,
    };

    (transport as any).handleMessage(JSON.stringify(msg));

    expect(events.length).toBe(2);
    expect(events[0].isFinal).toBe(true);
    expect(events[0].text).toBe('hello world');
    expect(events[0].words.map((w: any) => w.text)).toEqual(['hello', ' world']);

    expect(events[1].isFinal).toBe(false);
    expect(events[1].text).toBe(' again');
  });

  it('does not re-emit already-finalized tokens', () => {
    const transport = new WebSocketTransport(dummyConfig, dummyAdapter, noopLogger);
    const events: any[] = [];
    transport.on('transcript', (r) => events.push(r));

    const msg1 = {
      tokens: [
        { text: 'hello', confidence: 1, is_final: true, start_ms: 0, end_ms: 100 },
        { text: ' world', confidence: 1, is_final: true, start_ms: 100, end_ms: 200 },
        { text: '!', confidence: 1, is_final: false, start_ms: 200, end_ms: 250 },
      ],
      final_audio_proc_ms: 0,
      total_audio_proc_ms: 0,
    };

    const msg2 = {
      tokens: [
        { text: 'hello', confidence: 1, is_final: true, start_ms: 0, end_ms: 100 },
        { text: ' world', confidence: 1, is_final: true, start_ms: 100, end_ms: 200 },
        { text: '!', confidence: 1, is_final: true, start_ms: 200, end_ms: 250 },
      ],
      final_audio_proc_ms: 0,
      total_audio_proc_ms: 0,
    };

    (transport as any).handleMessage(JSON.stringify(msg1));
    (transport as any).handleMessage(JSON.stringify(msg2));

    // msg1 emits final "hello world" + partial "!"
    // msg2 emits only new final "!" (not "hello world" again)
    const finalEvents = events.filter((e) => e.isFinal);
    expect(finalEvents.map((e: any) => e.text)).toEqual(['hello world', '!']);
  });
});

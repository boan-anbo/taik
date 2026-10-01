/**
 * Tests for EventEmitter
 */

import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../utils/event-emitter.js';

interface TestEvents {
  message: { text: string };
  count: number;
  empty: void;
}

describe('EventEmitter', () => {
  it('should emit and receive events with payload', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback = vi.fn((payload: { text: string }) => {});

    emitter.on('message', callback);
    emitter.emit('message', { text: 'hello' });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('should emit void events without payload', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback = vi.fn(() => {});

    emitter.on('empty', callback);
    emitter.emit('empty');

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support multiple listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback1 = vi.fn(() => {});
    const callback2 = vi.fn(() => {});

    emitter.on('count', callback1);
    emitter.on('count', callback2);
    emitter.emit('count', 42);

    expect(callback1).toHaveBeenCalledWith(42);
    expect(callback2).toHaveBeenCalledWith(42);
  });

  it('should remove listener with off()', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback = vi.fn(() => {});

    emitter.on('count', callback);
    emitter.off('count', callback);
    emitter.emit('count', 42);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should support once() for single-fire listeners', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback = vi.fn(() => {});

    emitter.once('count', callback);
    emitter.emit('count', 1);
    emitter.emit('count', 2);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(1);
  });

  it('should remove all listeners for an event', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback1 = vi.fn(() => {});
    const callback2 = vi.fn(() => {});

    emitter.on('count', callback1);
    emitter.on('count', callback2);
    emitter.removeAllListeners('count');
    emitter.emit('count', 42);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should remove all listeners when no event specified', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback1 = vi.fn(() => {});
    const callback2 = vi.fn(() => {});

    emitter.on('count', callback1);
    emitter.on('message', callback2);
    emitter.removeAllListeners();
    emitter.emit('count', 42);
    emitter.emit('message', { text: 'hi' });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should return correct listener count', () => {
    const emitter = new EventEmitter<TestEvents>();
    const callback = () => {};

    expect(emitter.listenerCount('count')).toBe(0);

    emitter.on('count', callback);
    expect(emitter.listenerCount('count')).toBe(1);

    emitter.on('count', () => {});
    expect(emitter.listenerCount('count')).toBe(2);
  });

  it('should return true for emit when listeners exist', () => {
    const emitter = new EventEmitter<TestEvents>();

    expect(emitter.emit('count', 1)).toBe(false);

    emitter.on('count', () => {});
    expect(emitter.emit('count', 1)).toBe(true);
  });

  it('should not throw when listener throws', () => {
    const emitter = new EventEmitter<TestEvents>();
    const errorCallback = () => {
      throw new Error('Test error');
    };
    const successCallback = vi.fn(() => {});

    emitter.on('count', errorCallback);
    emitter.on('count', successCallback);

    // Should not throw
    expect(() => emitter.emit('count', 42)).not.toThrow();

    // Second listener should still be called
    expect(successCallback).toHaveBeenCalled();
  });
});

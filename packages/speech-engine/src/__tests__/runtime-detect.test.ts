/**
 * Tests for runtime detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectRuntime, resetRuntimeAdapter } from '../runtime/detect.js';

describe('Runtime Detection', () => {
  beforeEach(() => {
    resetRuntimeAdapter();
  });

  afterEach(() => {
    resetRuntimeAdapter();
  });

  it('should detect a runtime', () => {
    const runtime = detectRuntime();

    // Should return one of the known runtime types
    expect(['browser', 'node', 'bun', 'cloudflare', 'deno', 'react-native', 'unknown']).toContain(runtime);
  });

  it('should detect bun runtime when running in bun', () => {
    // This test only passes when running in Bun
    const runtime = detectRuntime();

    // If we're running this test with Bun, it should detect 'bun'
    // If running with Node, it should detect 'node'
    if (typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined') {
      expect(runtime).toBe('bun');
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      expect(runtime).toBe('node');
    }
  });

  it('should return consistent results on multiple calls', () => {
    const runtime1 = detectRuntime();
    const runtime2 = detectRuntime();

    expect(runtime1).toBe(runtime2);
  });
});

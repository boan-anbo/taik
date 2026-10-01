/**
 * Tests for ReconnectionManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReconnectionManager } from '../transport/reconnection-manager.js';

describe('ReconnectionManager', () => {
  let manager: ReconnectionManager;

  beforeEach(() => {
    manager = new ReconnectionManager(
      true,  // enabled
      3,     // maxAttempts
      1000,  // initialDelayMs
      10000, // maxDelayMs
      2      // backoffMultiplier
    );
  });

  it('should be enabled when constructed with enabled=true', () => {
    expect(manager.isEnabled()).toBe(true);
  });

  it('should be disabled when constructed with enabled=false', () => {
    const disabled = new ReconnectionManager(false, 3, 1000, 10000, 2);
    expect(disabled.isEnabled()).toBe(false);
  });

  it('should allow attempts when under max', () => {
    expect(manager.canAttempt()).toBe(true);
    expect(manager.getAttempts()).toBe(0);
  });

  it('should track attempts correctly', () => {
    manager.recordAttempt();
    expect(manager.getAttempts()).toBe(1);

    manager.recordAttempt();
    expect(manager.getAttempts()).toBe(2);
  });

  it('should stop allowing attempts after max reached', () => {
    manager.recordAttempt();
    manager.recordAttempt();
    manager.recordAttempt();

    expect(manager.canAttempt()).toBe(false);
  });

  it('should calculate exponential backoff delays', () => {
    // First attempt: 1000ms (±10% jitter)
    const delay1 = manager.getNextDelay();
    expect(delay1).toBeGreaterThanOrEqual(900);
    expect(delay1).toBeLessThanOrEqual(1100);

    manager.recordAttempt();

    // Second attempt: 2000ms (±10% jitter)
    const delay2 = manager.getNextDelay();
    expect(delay2).toBeGreaterThanOrEqual(1800);
    expect(delay2).toBeLessThanOrEqual(2200);

    manager.recordAttempt();

    // Third attempt: 4000ms (±10% jitter)
    const delay3 = manager.getNextDelay();
    expect(delay3).toBeGreaterThanOrEqual(3600);
    expect(delay3).toBeLessThanOrEqual(4400);
  });

  it('should cap delay at maxDelayMs', () => {
    // Create manager with small max delay
    const capped = new ReconnectionManager(true, 10, 1000, 2000, 2);

    capped.recordAttempt();
    capped.recordAttempt();
    capped.recordAttempt();
    capped.recordAttempt();

    // After 4 attempts, calculated delay would be 8000ms, but should be capped at 2000ms
    const delay = capped.getNextDelay();
    expect(delay).toBeLessThanOrEqual(2200); // 2000 + 10% jitter
  });

  it('should reset attempts', () => {
    manager.recordAttempt();
    manager.recordAttempt();
    expect(manager.getAttempts()).toBe(2);

    manager.reset();
    expect(manager.getAttempts()).toBe(0);
    expect(manager.canAttempt()).toBe(true);
  });

  it('should return max attempts', () => {
    expect(manager.getMaxAttempts()).toBe(3);
  });

  it('should not allow attempts when disabled', () => {
    const disabled = new ReconnectionManager(false, 3, 1000, 10000, 2);
    expect(disabled.canAttempt()).toBe(false);
  });
});

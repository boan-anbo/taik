/**
 * Reconnection manager with exponential backoff
 */

export class ReconnectionManager {
  private enabled: boolean;
  private maxAttempts: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private backoffMultiplier: number;
  private attempts: number = 0;

  constructor(
    enabled: boolean,
    maxAttempts: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number
  ) {
    this.enabled = enabled;
    this.maxAttempts = maxAttempts;
    this.initialDelayMs = initialDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  /** Check if reconnection is enabled */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** Check if we can attempt another reconnection */
  canAttempt(): boolean {
    return this.enabled && this.attempts < this.maxAttempts;
  }

  /** Get the delay for the next reconnection attempt */
  getNextDelay(): number {
    const delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, this.attempts);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, this.maxDelayMs);
  }

  /** Record a reconnection attempt */
  recordAttempt(): void {
    this.attempts++;
  }

  /** Get the number of attempts made */
  getAttempts(): number {
    return this.attempts;
  }

  /** Get the maximum number of attempts */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  /** Reset the attempt counter */
  reset(): void {
    this.attempts = 0;
  }
}

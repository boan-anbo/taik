/**
 * Type-safe event emitter implementation
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener<T> = T extends void ? () => void : (payload: T) => void;

/**
 * A minimal, type-safe event emitter
 * Works in all JavaScript runtimes (browser, Node, Bun, Cloudflare)
 */
export class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown }> {
  private listeners = new Map<keyof TEvents, Set<Listener<unknown>>>();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return this;
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<unknown>);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this {
    const onceListener = ((payload: TEvents[K]) => {
      this.off(event, onceListener as Listener<TEvents[K]>);
      (listener as (payload: TEvents[K]) => void)(payload);
    }) as Listener<TEvents[K]>;

    return this.on(event, onceListener);
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEvents>(
    event: K,
    ...args: TEvents[K] extends void ? [] : [payload: TEvents[K]]
  ): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return false;
    }

    const payload = args[0];
    for (const listener of set) {
      try {
        (listener as (payload?: TEvents[K]) => void)(payload);
      } catch (error) {
        // Log but don't throw - one listener shouldn't break others
        console.error(`Error in event listener for "${String(event)}":`, error);
      }
    }

    return true;
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners<K extends keyof TEvents>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

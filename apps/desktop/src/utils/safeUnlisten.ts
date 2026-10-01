import type { UnlistenFn } from '@tauri-apps/api/event';

export function safeUnlisten(unlisten?: UnlistenFn): void {
  if (!unlisten) return;

  try {
    const result = (unlisten as unknown as () => unknown)();
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      void (result as Promise<void>).catch(() => {
        // Ignore unlisten errors (can happen during HMR / window teardown)
      });
    }
  } catch {
    // Ignore unlisten errors (can happen during HMR / window teardown)
  }
}


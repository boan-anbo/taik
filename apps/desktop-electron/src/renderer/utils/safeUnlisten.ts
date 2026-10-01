export function safeUnlisten(unlisten?: (() => void) | Promise<(() => void) | void>): void {
  if (!unlisten) return;

  try {
    if (typeof (unlisten as any).then === 'function') {
      void (unlisten as Promise<any>).then((fn) => {
        try {
          if (typeof fn === 'function') fn();
        } catch {
          // ignore
        }
      });
      return;
    }

    if (typeof unlisten === 'function') {
      unlisten();
    }
  } catch {
    // ignore
  }
}

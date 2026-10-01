import { contextBridge, ipcRenderer } from 'electron';

type StoreChangedPayload = { key: string; newValue: unknown; oldValue: unknown };
type EventPayload = { eventName: string; payload?: unknown };
type LogPayload = { level: string; windowLabel: string; message: string; timestamp: number };

const storeListeners = new Set<(p: StoreChangedPayload) => void>();
const eventListeners = new Map<string, Set<(payload: unknown) => void>>();
const hotkeyHandlers = new Map<string, () => void>();

ipcRenderer.on('taik:store:changed', (_e, payload: StoreChangedPayload) => {
  for (const cb of storeListeners) cb(payload);
});

ipcRenderer.on('taik:event', (_e, payload: EventPayload) => {
  const listeners = eventListeners.get(payload.eventName);
  if (!listeners) return;
  for (const cb of listeners) cb(payload.payload);
});

ipcRenderer.on('taik:hotkey:trigger', (_e, payload: { id: string }) => {
  const handler = hotkeyHandlers.get(payload.id);
  if (handler) handler();
});

function getWindowLabel(): string {
  const h = window.location.hash || '#/';
  if (h.includes('/voice-panel')) return 'floating-voice';
  if (h.includes('/deck-panel')) return 'floating-deck';
  return 'main';
}

function serializeLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) {
        return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ''}`;
      }
      if (typeof a === 'string') return a;
      if (typeof a === 'number' || typeof a === 'boolean' || a === null || a === undefined) {
        return String(a);
      }
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function appendLog(level: string, args: unknown[]) {
  const payload: LogPayload = {
    level,
    windowLabel: getWindowLabel(),
    message: serializeLogArgs(args),
    timestamp: Date.now(),
  };
  ipcRenderer.send('taik:log:append', payload);
}

// Persist console logs and unhandled errors to the main process so we can debug packaged builds.
// This runs before renderer code, so we get early boot logs too.
try {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    originalError.apply(console, args as any);
    appendLog('error', args);
  };

  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    originalWarn.apply(console, args as any);
    appendLog('warn', args);
  };

  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    originalInfo.apply(console, args as any);
    appendLog('info', args);
  };

  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    originalLog.apply(console, args as any);
    appendLog('log', args);
  };

  window.addEventListener('error', (event) => {
    appendLog('uncaught', [`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
  });

  window.addEventListener('unhandledrejection', (event) => {
    appendLog('promise', [event.reason]);
  });
} catch {
  // ignore
}

const api = {
  store: {
    get: (key: string) => ipcRenderer.invoke('taik:store:get', key) as Promise<unknown>,
    set: (key: string, value: unknown) => ipcRenderer.invoke('taik:store:set', key, value) as Promise<void>,
    delete: (key: string) => ipcRenderer.invoke('taik:store:delete', key) as Promise<void>,
    keys: () => ipcRenderer.invoke('taik:store:keys') as Promise<string[]>,
    clear: () => ipcRenderer.invoke('taik:store:clear') as Promise<void>,
    onChanged: (cb: (p: StoreChangedPayload) => void) => {
      storeListeners.add(cb);
      return () => storeListeners.delete(cb);
    },
  },
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('taik:clipboard:writeText', text) as Promise<void>,
    readText: () => ipcRenderer.invoke('taik:clipboard:readText') as Promise<string>,
  },
  dialog: {
    open: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('taik:dialog:open', options) as Promise<Electron.OpenDialogReturnValue>,
    save: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('taik:dialog:save', options) as Promise<Electron.SaveDialogReturnValue>,
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('taik:fs:readFile', filePath) as Promise<ArrayBuffer>,
    writeFile: (filePath: string, data: ArrayBuffer) => ipcRenderer.invoke('taik:fs:writeFile', filePath, data) as Promise<void>,
    exists: (filePath: string) => ipcRenderer.invoke('taik:fs:exists', filePath) as Promise<boolean>,
    mkdir: (dirPath: string) => ipcRenderer.invoke('taik:fs:mkdir', dirPath) as Promise<void>,
    remove: (targetPath: string) => ipcRenderer.invoke('taik:fs:remove', targetPath) as Promise<void>,
  },
  path: {
    userData: () => ipcRenderer.invoke('taik:path:userData') as Promise<string>,
    join: (...parts: string[]) => ipcRenderer.invoke('taik:path:join', ...parts) as Promise<string>,
  },
  app: {
    getVersion: () => ipcRenderer.invoke('taik:app:getVersion') as Promise<string>,
    quit: () => ipcRenderer.invoke('taik:app:quit') as Promise<void>,
    restart: () => ipcRenderer.invoke('taik:app:restart') as Promise<void>,
  },
  notification: {
    show: (options: { title: string; body: string }) => ipcRenderer.invoke('taik:notification:show', options) as Promise<void>,
  },
  shell: {
    openPath: (p: string) => ipcRenderer.invoke('taik:shell:openPath', p) as Promise<void>,
  },
  window: {
    show: (label: string) => ipcRenderer.invoke('taik:window:show', label) as Promise<void>,
    showInactive: (label: string) => ipcRenderer.invoke('taik:window:showInactive', label) as Promise<void>,
    hide: (label: string) => ipcRenderer.invoke('taik:window:hide', label) as Promise<void>,
    focus: (label: string) => ipcRenderer.invoke('taik:window:focus', label) as Promise<void>,
    close: (label: string) => ipcRenderer.invoke('taik:window:close', label) as Promise<void>,
    isVisible: (label: string) => ipcRenderer.invoke('taik:window:isVisible', label) as Promise<boolean>,
    toggle: (label: string) => ipcRenderer.invoke('taik:window:toggle', label) as Promise<void>,
  },
  events: {
    emit: (eventName: string, payload?: unknown) => ipcRenderer.send('taik:event:emit', eventName, payload),
    listen: (eventName: string, cb: (payload: unknown) => void) => {
      if (!eventListeners.has(eventName)) eventListeners.set(eventName, new Set());
      eventListeners.get(eventName)!.add(cb);
      return () => {
        eventListeners.get(eventName)?.delete(cb);
      };
    },
  },
  hotkeys: {
    register: async (id: string, shortcut: string, handler: () => void) => {
      hotkeyHandlers.set(id, handler);
      await ipcRenderer.invoke('taik:hotkey:register', id, shortcut);
    },
    unregister: async (id: string) => {
      hotkeyHandlers.delete(id);
      await ipcRenderer.invoke('taik:hotkey:unregister', id);
    },
    unregisterAll: async () => {
      hotkeyHandlers.clear();
      await ipcRenderer.invoke('taik:hotkey:unregisterAll');
    },
    isRegistered: (shortcut: string) => ipcRenderer.invoke('taik:hotkey:isRegistered', shortcut) as Promise<boolean>,
  },
  accessibility: {
    checkSystemEvents: (prompt?: boolean) =>
      ipcRenderer.invoke('taik:accessibility:checkSystemEvents', prompt) as Promise<boolean>,
    pasteText: (text: string) => ipcRenderer.invoke('taik:accessibility:pasteText', text) as Promise<boolean>,
  },
  media: {
    getMicrophoneAccessStatus: () =>
      ipcRenderer.invoke('taik:media:getMicrophoneAccessStatus') as Promise<string>,
    requestMicrophoneAccess: () =>
      ipcRenderer.invoke('taik:media:requestMicrophoneAccess') as Promise<boolean>,
    openMicrophonePrivacySettings: () =>
      ipcRenderer.invoke('taik:media:openMicrophonePrivacySettings') as Promise<void>,
  },
  logs: {
    openFolder: () => ipcRenderer.invoke('taik:logs:openFolder') as Promise<void>,
  },
};

contextBridge.exposeInMainWorld('__TAIK__', api);

export type TaikElectronApi = typeof api;

import { app, BrowserWindow, ipcMain, Notification, dialog, shell, systemPreferences, globalShortcut, session } from 'electron';
import path from 'path';
import fs from 'fs/promises';

type WindowLabel = 'main' | 'floating-deck' | 'floating-voice';

type KeyValueStore = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  clear(): void;
  store: Record<string, unknown>;
};

let store: KeyValueStore | null = null;
let lastActiveBundleId: string | null = null;
let selfBundleId: string | null = null;
const windows = new Map<WindowLabel, BrowserWindow>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function windowLabelForWebContentsId(id: number): WindowLabel | undefined {
  for (const [label, win] of windows.entries()) {
    if (win.webContents.id === id) return label;
  }
  return undefined;
}

async function appendMainLog(line: string): Promise<void> {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, 'main.log');
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
  } catch {
    // ignore
  }
}

async function appendRendererLog(label: WindowLabel, line: string): Promise<void> {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    await fs.mkdir(logDir, { recursive: true });
    const logFile = path.join(logDir, `renderer-${label}.log`);
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
  } catch {
    // ignore
  }
}

function getPasteHelperCandidates(): string[] {
  if (app.isPackaged) {
    return [path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'native', 'taik-paste')];
  }
  const cwd = process.cwd();
  const appPath = app.getAppPath();
  return [
    path.join(cwd, 'dist', 'native', 'taik-paste'),
    path.join(appPath, 'dist', 'native', 'taik-paste'),
    path.join(path.dirname(appPath), 'dist', 'native', 'taik-paste'),
  ];
}

async function execPasteHelper(args: string[]): Promise<string> {
  const { execFile } = require('child_process');
  const candidates = getPasteHelperCandidates();
  let lastError: unknown;
  for (const helperPath of candidates) {
    try {
      await fs.access(helperPath);
      const output = await new Promise<string>((resolve, reject) => {
        execFile(helperPath, args, { encoding: 'utf8' }, (err: Error | null, stdout: string) => {
          if (err) reject(err);
          else resolve(stdout ?? '');
        });
      });
      return output.trim();
    } catch (err) {
      lastError = err;
    }
  }
  void appendMainLog(
    `[${new Date().toISOString()}] [pasteHelper] Failed (${candidates.join(', ')}): ${safeStringify(lastError)}`
  );
  throw lastError instanceof Error ? lastError : new Error('paste helper failed');
}

function isSelfBundleId(bundleId: string | null): boolean {
  return Boolean(bundleId && selfBundleId && bundleId === selfBundleId);
}

async function refreshSelfBundleId(): Promise<void> {
  if (process.platform !== 'darwin') return;
  try {
    const bundleId = await execPasteHelper(['--frontmost']);
    if (bundleId) selfBundleId = bundleId;
  } catch (err) {
    void appendMainLog(
      `[${new Date().toISOString()}] [frontmost] self bundle detect failed: ${safeStringify(err)}`
    );
  }
}

async function captureFrontmostApp(): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  if (BrowserWindow.getFocusedWindow()) return lastActiveBundleId;
  try {
    const bundleId = await execPasteHelper(['--frontmost']);
    if (!bundleId) return null;
    if (isSelfBundleId(bundleId)) return lastActiveBundleId;
    lastActiveBundleId = bundleId;
    return bundleId;
  } catch (err) {
    void appendMainLog(
      `[${new Date().toISOString()}] [frontmost] capture failed: ${safeStringify(err)}`
    );
    return null;
  }
}

async function activateLastActiveApp(): Promise<boolean> {
  if (process.platform !== 'darwin') return false;
  const bundleId = lastActiveBundleId;
  if (!bundleId || isSelfBundleId(bundleId)) return false;
  try {
    await execPasteHelper(['--activate', bundleId]);
    await new Promise((r) => setTimeout(r, 80));
    return true;
  } catch (err) {
    void appendMainLog(
      `[${new Date().toISOString()}] [frontmost] activate failed (${bundleId}): ${safeStringify(err)}`
    );
    return false;
  }
}

function safeStringify(value: unknown): string {
  try {
    if (value instanceof Error) {
      return `${value.name}: ${value.message}\n${value.stack ?? ''}`.trim();
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type ClipboardSnapshot = {
  formats: string[];
  text?: string;
  html?: string;
  rtf?: string;
  image?: unknown;
};

function captureClipboardSnapshot(clipboard: any): ClipboardSnapshot {
  const formats = clipboard.availableFormats();
  const snapshot: ClipboardSnapshot = { formats };
  if (formats.includes('text/plain')) snapshot.text = clipboard.readText();
  if (formats.includes('text/html')) snapshot.html = clipboard.readHTML();
  if (formats.includes('text/rtf')) snapshot.rtf = clipboard.readRTF();

  const hasImage = formats.some((format: string) => format.startsWith('image/'));
  if (hasImage) {
    const image = clipboard.readImage();
    if (!image.isEmpty()) snapshot.image = image;
  }
  return snapshot;
}

function restoreClipboardSnapshot(clipboard: any, snapshot: ClipboardSnapshot): void {
  if (!snapshot.formats.length) return;
  const data: Record<string, unknown> = {};
  if (snapshot.formats.includes('text/plain')) data.text = snapshot.text ?? '';
  if (snapshot.formats.includes('text/html')) data.html = snapshot.html ?? '';
  if (snapshot.formats.includes('text/rtf')) data.rtf = snapshot.rtf ?? '';
  if (snapshot.image) data.image = snapshot.image;
  if (Object.keys(data).length) clipboard.write(data);
}

function registerCrashHandlers() {
  const write = async (tag: string, payload: unknown) => {
    const now = new Date().toISOString();
    await appendMainLog(`[${now}] [${tag}] ${safeStringify(payload)}`);
  };

  process.on('uncaughtException', (err) => {
    void write('uncaughtException', err);
    try {
      dialog.showErrorBox('Taik crashed (main process)', safeStringify(err));
    } catch {
      // ignore
    }
  });

  process.on('unhandledRejection', (reason) => {
    void write('unhandledRejection', reason);
  });

  app.on('render-process-gone', (_event, webContents, details) => {
    void write('render-process-gone', { id: webContents.id, details });
  });

  app.on('child-process-gone', (_event, details) => {
    void write('child-process-gone', details);
  });
}

async function getStore(): Promise<KeyValueStore> {
  if (store) return store;
  const { default: Store } = await import('electron-store');
  store = new Store({ name: 'taik-store' }) as unknown as KeyValueStore;
  return store;
}

function rendererUrl(route: string): string {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    return `${devUrl.replace(/\/$/, '')}/#${route}`;
  }
  // Production: load built files from dist/renderer
  // Use file:// and hash routing.
  const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');
  return `file://${indexPath}#${route}`;
}

function createWindow(label: WindowLabel): BrowserWindow {
  const isFloating = label !== 'main';
  const nonActivating = isFloating && process.platform === 'darwin';

  const win = new BrowserWindow({
    title: label === 'main' ? 'Taik' : label === 'floating-deck' ? 'Taik Deck' : 'Taik Voice',
    width: label === 'main' ? 1000 : label === 'floating-deck' ? 320 : 200,
    height: label === 'main' ? 700 : label === 'floating-deck' ? 200 : 140,
    minWidth: label === 'main' ? 700 : label === 'floating-deck' ? 200 : 120,
    minHeight: label === 'main' ? 500 : label === 'floating-deck' ? 100 : 100,
    show: label === 'main',
    resizable: true,
    frame: label === 'main',
    transparent: isFloating,
    alwaysOnTop: isFloating,
    skipTaskbar: isFloating,
    focusable: !nonActivating,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(rendererUrl(label === 'main' ? '/' : label === 'floating-deck' ? '/deck-panel' : '/voice-panel'));
  return win;
}

async function ensureMicPermission(): Promise<void> {
  if (process.platform !== 'darwin') return;
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    if (status !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }
  } catch {
    // ignore
  }
}

function broadcast(channel: string, payload?: unknown) {
  for (const win of windows.values()) {
    win.webContents.send(channel, payload);
  }
}

function registerPermissionHandlers() {
  const allow = new Set([
    // Electron may use different strings across versions/platforms.
    'media',
    'mediaAudioCapture',
    'mediaVideoCapture',
    'audioCapture',
    'videoCapture',
  ]);

  session.defaultSession.setPermissionRequestHandler(async (_wc, permission, callback, details) => {
    const allowed = allow.has(permission);
    await appendMainLog(
      `[${new Date().toISOString()}] [permissionRequest] ${permission} allowed=${allowed} details=${safeStringify(details)}`
    );
    callback(allowed);
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission, _origin, details) => {
    return allow.has(permission) || (permission === 'media' && (details as any)?.mediaTypes?.includes?.('audio'));
  });
}

async function registerIpc() {
  const store = await getStore();

  ipcMain.handle('taik:store:get', (_e, key: string) => store.get(key) ?? null);
  ipcMain.handle('taik:store:set', (_e, key: string, value: unknown) => {
    const oldValue = store.get(key) ?? null;
    store.set(key, value);
    broadcast('taik:store:changed', { key, newValue: value, oldValue });
  });
  ipcMain.handle('taik:store:delete', (_e, key: string) => {
    const oldValue = store.get(key) ?? null;
    store.delete(key);
    broadcast('taik:store:changed', { key, newValue: null, oldValue });
  });
  ipcMain.handle('taik:store:keys', () => Object.keys(store.store));
  ipcMain.handle('taik:store:clear', () => {
    store.clear();
    broadcast('taik:store:cleared');
  });

  ipcMain.handle('taik:clipboard:writeText', (_e, text: string) => {
    const { clipboard } = require('electron');
    clipboard.writeText(text);
  });
  ipcMain.handle('taik:clipboard:readText', () => {
    const { clipboard } = require('electron');
    return clipboard.readText();
  });

  ipcMain.handle('taik:dialog:open', async (_e, options: Electron.OpenDialogOptions) => {
    return await dialog.showOpenDialog(options);
  });
  ipcMain.handle('taik:dialog:save', async (_e, options: Electron.SaveDialogOptions) => {
    return await dialog.showSaveDialog(options);
  });

  ipcMain.handle('taik:fs:readFile', async (_e, filePath: string) => {
    const data = await fs.readFile(filePath);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  });
  ipcMain.handle('taik:fs:writeFile', async (_e, filePath: string, data: ArrayBuffer) => {
    await fs.writeFile(filePath, Buffer.from(data));
  });
  ipcMain.handle('taik:fs:exists', async (_e, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle('taik:fs:mkdir', async (_e, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true });
  });
  ipcMain.handle('taik:fs:remove', async (_e, targetPath: string) => {
    await fs.rm(targetPath, { force: true });
  });

  ipcMain.handle('taik:path:userData', () => app.getPath('userData'));
  ipcMain.handle('taik:path:join', (_e, ...parts: string[]) => path.join(...parts));

  ipcMain.handle('taik:app:getVersion', () => app.getVersion());
  ipcMain.handle('taik:app:quit', () => app.quit());
  ipcMain.handle('taik:app:restart', () => {
    app.relaunch();
    app.exit(0);
  });
  ipcMain.handle('taik:app:captureFrontmost', async () => {
    return await captureFrontmostApp();
  });

  ipcMain.handle('taik:shell:openPath', async (_e, p: string) => {
    await shell.openPath(p);
  });

  ipcMain.handle('taik:notification:show', (_e, options: { title: string; body: string }) => {
    try {
      new Notification({ title: options.title, body: options.body }).show();
    } catch {
      // ignore
    }
  });

  ipcMain.handle('taik:window:show', (_e, label: WindowLabel) => windows.get(label)?.show());
  ipcMain.handle('taik:window:showInactive', (_e, label: WindowLabel) => {
    const win = windows.get(label);
    if (!win) return;
    if (typeof (win as any).showInactive === 'function') {
      (win as any).showInactive();
    } else {
      win.show();
    }
  });
  ipcMain.handle('taik:window:hide', (_e, label: WindowLabel) => windows.get(label)?.hide());
  ipcMain.handle('taik:window:focus', (_e, label: WindowLabel) => windows.get(label)?.focus());
  ipcMain.handle('taik:window:close', (_e, label: WindowLabel) => windows.get(label)?.close());
  ipcMain.handle('taik:window:isVisible', (_e, label: WindowLabel) => windows.get(label)?.isVisible() ?? false);
  ipcMain.handle('taik:window:toggle', (_e, label: WindowLabel) => {
    const win = windows.get(label);
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.show();
  });

  // Event bus (renderer emit -> main broadcast -> all renderers listen)
  ipcMain.on('taik:event:emit', (_e, eventName: string, payload?: unknown) => {
    broadcast('taik:event', { eventName, payload });
  });

  // Global hotkeys - renderer registers and receives trigger events.
  const hotkeyMap = new Map<string, { shortcut: string; webContentsId: number }>();

  ipcMain.handle('taik:hotkey:register', (e, id: string, shortcut: string) => {
    // Best-effort unregister old
    const existing = hotkeyMap.get(id);
    if (existing) {
      globalShortcut.unregister(existing.shortcut);
      hotkeyMap.delete(id);
    }

    const ok = globalShortcut.register(shortcut, () => {
      if (id === 'toggle-floating-voice' || id === 'toggle-recording') {
        void captureFrontmostApp();
      }
      const target = BrowserWindow.getAllWindows().find((w) => w.webContents.id === e.sender.id);
      (target ?? windows.get('main'))?.webContents.send('taik:hotkey:trigger', { id });
    });
    if (!ok) {
      throw new Error(`Failed to register hotkey: ${shortcut}`);
    }
    hotkeyMap.set(id, { shortcut, webContentsId: e.sender.id });
  });

  ipcMain.handle('taik:hotkey:unregister', (_e, id: string) => {
    const existing = hotkeyMap.get(id);
    if (!existing) return;
    globalShortcut.unregister(existing.shortcut);
    hotkeyMap.delete(id);
  });

  ipcMain.handle('taik:hotkey:unregisterAll', () => {
    globalShortcut.unregisterAll();
    hotkeyMap.clear();
  });

  ipcMain.handle('taik:hotkey:isRegistered', (_e, shortcut: string) => globalShortcut.isRegistered(shortcut));

  // macOS paste-based insertion (optional)
  ipcMain.handle('taik:accessibility:checkSystemEvents', async (_e, prompt?: boolean) => {
    if (process.platform !== 'darwin') return true;
    try {
      return systemPreferences.isTrustedAccessibilityClient(Boolean(prompt));
    } catch {
      return false;
    }
  });

  ipcMain.handle('taik:accessibility:pasteText', async (_e, text: string) => {
    if (process.platform !== 'darwin') return false;
    const { clipboard } = require('electron');
    const startedAt = Date.now();
    const logStep = (step: string, extra?: string) => {
      const delta = Date.now() - startedAt;
      const suffix = extra ? ` ${extra}` : '';
      void appendMainLog(
        `[${new Date().toISOString()}] [pasteText] ${step} +${delta}ms${suffix}`
      );
    };
    try {
      const securePid = await execPasteHelper(['--secure-input']);
      if (securePid) {
        void appendMainLog(
          `[${new Date().toISOString()}] [pasteText] Secure Input active (pid=${securePid}).`
        );
        return false;
      }
    } catch (err) {
      void appendMainLog(
        `[${new Date().toISOString()}] [pasteText] Secure Input check failed: ${safeStringify(err)}`
      );
    }

    try {
      const axResult = await execPasteHelper(['--ax-insert', text]);
      if (axResult === '1') {
        logStep('done via AX');
        return true;
      }
    } catch (err) {
      void appendMainLog(
        `[${new Date().toISOString()}] [pasteText] AX insert failed: ${safeStringify(err)}`
      );
    }

    const snapshot = captureClipboardSnapshot(clipboard);
    try {
      clipboard.write({ text });
      await delay(50);
      await activateLastActiveApp();
      await execPasteHelper(['--paste']);
      logStep('done via paste');
      return true;
    } catch (err) {
      void appendMainLog(
        `[${new Date().toISOString()}] [pasteText] CGEvent paste helper failed: ${safeStringify(err)}`
      );
      logStep('failed via paste');
      return false;
    } finally {
      await delay(100);
      try {
        restoreClipboardSnapshot(clipboard, snapshot);
      } catch {
        // ignore
      }
    }
  });

  // macOS microphone permissions helpers
  ipcMain.handle('taik:media:getMicrophoneAccessStatus', () => {
    if (process.platform !== 'darwin') return 'unknown';
    try {
      return systemPreferences.getMediaAccessStatus('microphone');
    } catch {
      return 'unknown';
    }
  });

  ipcMain.handle('taik:media:requestMicrophoneAccess', async () => {
    if (process.platform !== 'darwin') return true;
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      if (status === 'granted') return true;
      return await systemPreferences.askForMediaAccess('microphone');
    } catch {
      return false;
    }
  });

  ipcMain.handle('taik:media:openMicrophonePrivacySettings', async () => {
    if (process.platform !== 'darwin') return;
    try {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    } catch {
      // ignore
    }
  });

  ipcMain.handle('taik:logs:openFolder', async () => {
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      await fs.mkdir(logDir, { recursive: true });
      await shell.openPath(logDir);
    } catch {
      // ignore
    }
  });
}

type RendererLogPayload = { level: string; windowLabel?: string; message: string; timestamp: number };

function registerLogIngest() {
  ipcMain.on('taik:log:append', (e, payload: RendererLogPayload) => {
    const labelFromSender = windowLabelForWebContentsId(e.sender.id);
    const label = (payload.windowLabel as WindowLabel | undefined) ?? labelFromSender ?? 'main';
    const ts = new Date(payload.timestamp || Date.now()).toISOString();
    void appendRendererLog(label, `[${ts}] [${label}] [${payload.level}] ${payload.message}`);
  });
}

async function createAllWindows() {
  windows.set('main', createWindow('main'));
  windows.set('floating-deck', createWindow('floating-deck'));
  windows.set('floating-voice', createWindow('floating-voice'));

  windows.get('floating-deck')?.hide();
  windows.get('floating-voice')?.hide();
}

app.whenReady().then(async () => {
  registerCrashHandlers();
  registerLogIngest();
  registerPermissionHandlers();
  await registerIpc();
  await ensureMicPermission();
  await createAllWindows();
  app.on('browser-window-focus', () => {
    void refreshSelfBundleId();
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createAllWindows();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

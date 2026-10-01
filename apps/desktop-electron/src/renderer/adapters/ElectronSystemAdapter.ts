import type {
  ISystemAdapter,
  HotkeyHandler,
  NotificationOptions,
  TrayMenuEntry,
  WindowLabel,
} from '@taik/capabilities';
import { SystemError } from '@taik/capabilities';
import { getTaikApi } from '../platform/taik';

export class ElectronSystemAdapter implements ISystemAdapter {
  private hotkeyHandlers: Map<string, HotkeyHandler> = new Map();
  private hotkeyShortcuts: Map<string, string> = new Map();

  async copyToClipboard(text: string): Promise<void> {
    try {
      await getTaikApi().clipboard.writeText(text);
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to copy to clipboard', error);
    }
  }

  async readFromClipboard(): Promise<string> {
    try {
      return await getTaikApi().clipboard.readText();
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to read from clipboard', error);
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    try {
      await getTaikApi().notification.show({ title: options.title, body: options.body });
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to show notification', error);
    }
  }

  async hasNotificationPermission(): Promise<boolean> {
    return true;
  }

  async requestNotificationPermission(): Promise<boolean> {
    return true;
  }

  async registerHotkey(id: string, shortcut: string, handler: HotkeyHandler): Promise<void> {
    try {
      if (this.hotkeyHandlers.has(id)) {
        await this.unregisterHotkey(id);
      }
      this.hotkeyHandlers.set(id, handler);
      this.hotkeyShortcuts.set(id, shortcut);
      await getTaikApi().hotkeys.register(id, shortcut, handler);
    } catch (error) {
      throw new SystemError('HOTKEY_INVALID', `Failed to register hotkey "${shortcut}"`, error);
    }
  }

  async unregisterHotkey(id: string): Promise<void> {
    const shortcut = this.hotkeyShortcuts.get(id);
    if (!shortcut) return;
    try {
      await getTaikApi().hotkeys.unregister(id);
      this.hotkeyHandlers.delete(id);
      this.hotkeyShortcuts.delete(id);
    } catch (error) {
      throw new SystemError('UNKNOWN', `Failed to unregister hotkey "${id}"`, error);
    }
  }

  async isHotkeyRegistered(id: string): Promise<boolean> {
    const shortcut = this.hotkeyShortcuts.get(id);
    if (!shortcut) return false;
    try {
      return await getTaikApi().hotkeys.isRegistered(shortcut);
    } catch {
      return false;
    }
  }

  async unregisterAllHotkeys(): Promise<void> {
    try {
      await getTaikApi().hotkeys.unregisterAll();
      this.hotkeyHandlers.clear();
      this.hotkeyShortcuts.clear();
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to unregister all hotkeys', error);
    }
  }

  async setTrayMenu(_items: TrayMenuEntry[]): Promise<void> {
    // TODO: implement tray menu in main if needed
  }

  async setTrayTooltip(_tooltip: string): Promise<void> {
    // TODO: implement tray tooltip in main if needed
  }

  onTrayMenuClick(_handler: (itemId: string) => void): () => void {
    return () => {};
  }

  async showWindow(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.show(label ?? 'main');
  }

  async showWindowInactive(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.showInactive(label ?? 'main');
  }

  async hideWindow(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.hide(label ?? 'main');
  }

  async focusWindow(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.focus(label ?? 'main');
  }

  async closeWindow(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.close(label ?? 'main');
  }

  async isWindowVisible(label?: WindowLabel): Promise<boolean> {
    return await getTaikApi().window.isVisible(label ?? 'main');
  }

  async toggleWindow(label?: WindowLabel): Promise<void> {
    await getTaikApi().window.toggle(label ?? 'main');
  }

  async quit(): Promise<void> {
    await getTaikApi().app.quit();
  }

  async restart(): Promise<void> {
    await getTaikApi().app.restart();
  }

  async getAppVersion(): Promise<string> {
    return await getTaikApi().app.getVersion();
  }

  async getMicrophoneAccessStatus(): Promise<string> {
    return await getTaikApi().media.getMicrophoneAccessStatus();
  }

  async requestMicrophoneAccess(): Promise<boolean> {
    return await getTaikApi().media.requestMicrophoneAccess();
  }

  async openMicrophonePrivacySettings(): Promise<void> {
    await getTaikApi().media.openMicrophonePrivacySettings();
  }
}

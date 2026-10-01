/**
 * Tauri System Adapter
 * Implements ISystemAdapter using Tauri v2 APIs
 */

import { getCurrentWindow, Window } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import {
  register,
  unregister,
  isRegistered,
  unregisterAll,
} from '@tauri-apps/plugin-global-shortcut';
import type {
  ISystemAdapter,
  HotkeyHandler,
  NotificationOptions,
  TrayMenuEntry,
  WindowLabel,
} from '@taik/capabilities';
import { SystemError } from '@taik/capabilities';

/**
 * System adapter implementation for Tauri desktop app
 */
export class TauriSystemAdapter implements ISystemAdapter {
  private hotkeyHandlers: Map<string, HotkeyHandler> = new Map();
  private hotkeyShortcuts: Map<string, string> = new Map();

  // ===========================================================================
  // CLIPBOARD
  // ===========================================================================

  async copyToClipboard(text: string): Promise<void> {
    try {
      await writeText(text);
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to copy to clipboard', error);
    }
  }

  async readFromClipboard(): Promise<string> {
    try {
      const text = await readText();
      return text ?? '';
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to read from clipboard', error);
    }
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  async showNotification(options: NotificationOptions): Promise<void> {
    try {
      const permitted = await this.hasNotificationPermission();
      if (!permitted) {
        const granted = await this.requestNotificationPermission();
        if (!granted) {
          throw new SystemError('PERMISSION_DENIED', 'Notification permission denied');
        }
      }

      sendNotification({
        title: options.title,
        body: options.body,
      });
    } catch (error) {
      if (error instanceof SystemError) throw error;
      throw new SystemError('UNKNOWN', 'Failed to show notification', error);
    }
  }

  async hasNotificationPermission(): Promise<boolean> {
    try {
      return await isPermissionGranted();
    } catch {
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      const permission = await requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // GLOBAL HOTKEYS
  // ===========================================================================

  async registerHotkey(id: string, shortcut: string, handler: HotkeyHandler): Promise<void> {
    try {
      // Check if already registered with this id
      if (this.hotkeyHandlers.has(id)) {
        await this.unregisterHotkey(id);
      }

      // Register with Tauri
      await register(shortcut, (event) => {
        if (event.state === 'Pressed') {
          const h = this.hotkeyHandlers.get(id);
          if (h) h();
        }
      });

      // Store handler and shortcut mapping
      this.hotkeyHandlers.set(id, handler);
      this.hotkeyShortcuts.set(id, shortcut);
    } catch (error) {
      throw new SystemError('HOTKEY_INVALID', `Failed to register hotkey "${shortcut}"`, error);
    }
  }

  async unregisterHotkey(id: string): Promise<void> {
    const shortcut = this.hotkeyShortcuts.get(id);
    if (!shortcut) return;

    try {
      await unregister(shortcut);
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
      return await isRegistered(shortcut);
    } catch {
      return false;
    }
  }

  async unregisterAllHotkeys(): Promise<void> {
    try {
      await unregisterAll();
      this.hotkeyHandlers.clear();
      this.hotkeyShortcuts.clear();
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to unregister all hotkeys', error);
    }
  }

  // ===========================================================================
  // SYSTEM TRAY
  // ===========================================================================

  async setTrayMenu(_items: TrayMenuEntry[]): Promise<void> {
    // Note: Tray menu is configured in Rust side (tray.rs)
    // This method is a no-op for now as tray is statically defined
    console.warn('setTrayMenu: Dynamic tray menu not implemented, use tray.rs');
  }

  async setTrayTooltip(_tooltip: string): Promise<void> {
    // Note: Tooltip is set in Rust side
    console.warn('setTrayTooltip: Not implemented, use tray.rs');
  }

  onTrayMenuClick(_handler: (itemId: string) => void): () => void {
    // Note: Tray events come from Rust via window events
    // TODO: Implement tray menu event handling from Rust
    console.warn('onTrayMenuClick: Not fully implemented, use tray.rs');
    return () => {
      // Unsubscribe - no-op for now
    };
  }

  // ===========================================================================
  // WINDOW MANAGEMENT
  // ===========================================================================

  private getWindow(label?: WindowLabel): Window {
    if (!label || label === 'main') {
      return getCurrentWindow();
    }
    return new Window(label);
  }

  async showWindow(label?: WindowLabel): Promise<void> {
    try {
      const window = this.getWindow(label);
      await window.show();
    } catch (error) {
      throw new SystemError('UNKNOWN', `Failed to show window "${label}"`, error);
    }
  }

  async hideWindow(label?: WindowLabel): Promise<void> {
    try {
      const window = this.getWindow(label);
      await window.hide();
    } catch (error) {
      throw new SystemError('UNKNOWN', `Failed to hide window "${label}"`, error);
    }
  }

  async focusWindow(label?: WindowLabel): Promise<void> {
    try {
      const window = this.getWindow(label);
      await window.setFocus();
    } catch (error) {
      throw new SystemError('UNKNOWN', `Failed to focus window "${label}"`, error);
    }
  }

  async closeWindow(label?: WindowLabel): Promise<void> {
    try {
      const window = this.getWindow(label);
      await window.close();
    } catch (error) {
      throw new SystemError('UNKNOWN', `Failed to close window "${label}"`, error);
    }
  }

  async isWindowVisible(label?: WindowLabel): Promise<boolean> {
    try {
      const window = this.getWindow(label);
      return await window.isVisible();
    } catch {
      return false;
    }
  }

  async toggleWindow(label?: WindowLabel): Promise<void> {
    const visible = await this.isWindowVisible(label);
    if (visible) {
      await this.hideWindow(label);
    } else {
      await this.showWindow(label);
      await this.focusWindow(label);
    }
  }

  // ===========================================================================
  // APP LIFECYCLE
  // ===========================================================================

  async quit(): Promise<void> {
    try {
      await exit(0);
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to quit application', error);
    }
  }

  async restart(): Promise<void> {
    try {
      await relaunch();
    } catch (error) {
      throw new SystemError('UNKNOWN', 'Failed to restart application', error);
    }
  }

  async getAppVersion(): Promise<string> {
    try {
      return await getVersion();
    } catch {
      return '0.0.0';
    }
  }
}

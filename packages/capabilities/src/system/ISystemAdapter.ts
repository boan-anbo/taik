/**
 * System Adapter Interface
 * Platform-agnostic contract for system-level integrations.
 *
 * Implementations:
 * - Desktop: Tauri APIs (clipboard, notifications, hotkeys, tray)
 * - Mobile: React Native modules
 * - Web: Browser APIs (limited)
 */

/**
 * Tray menu item definition
 */
export interface TrayMenuItem {
  id: string;
  label: string;
  enabled?: boolean;
  checked?: boolean;
  accelerator?: string;
  submenu?: TrayMenuItem[];
}

/**
 * Tray menu separator
 */
export interface TrayMenuSeparator {
  type: 'separator';
}

export type TrayMenuEntry = TrayMenuItem | TrayMenuSeparator;

/**
 * Hotkey handler callback
 */
export type HotkeyHandler = () => void;

/**
 * Notification options
 */
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
}

/**
 * Window label for multi-window apps
 */
export type WindowLabel = string;

/**
 * System adapter interface for platform integrations
 */
export interface ISystemAdapter {
  // =========================================================================
  // CLIPBOARD
  // =========================================================================

  /**
   * Copy text to system clipboard
   */
  copyToClipboard(text: string): Promise<void>;

  /**
   * Read text from system clipboard
   */
  readFromClipboard(): Promise<string>;

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  /**
   * Show a system notification
   */
  showNotification(options: NotificationOptions): Promise<void>;

  /**
   * Check if notifications are permitted
   */
  hasNotificationPermission(): Promise<boolean>;

  /**
   * Request notification permission
   */
  requestNotificationPermission(): Promise<boolean>;

  // =========================================================================
  // GLOBAL HOTKEYS (Desktop only)
  // =========================================================================

  /**
   * Register a global hotkey
   * @param id - Unique identifier for this hotkey
   * @param shortcut - Shortcut string (e.g., "CmdOrCtrl+Shift+R")
   * @param handler - Callback when hotkey is pressed
   */
  registerHotkey(id: string, shortcut: string, handler: HotkeyHandler): Promise<void>;

  /**
   * Unregister a global hotkey
   */
  unregisterHotkey(id: string): Promise<void>;

  /**
   * Check if a hotkey is registered
   */
  isHotkeyRegistered(id: string): Promise<boolean>;

  /**
   * Unregister all hotkeys
   */
  unregisterAllHotkeys(): Promise<void>;

  // =========================================================================
  // SYSTEM TRAY (Desktop only)
  // =========================================================================

  /**
   * Set the system tray menu
   */
  setTrayMenu(items: TrayMenuEntry[]): Promise<void>;

  /**
   * Set tray icon tooltip
   */
  setTrayTooltip(tooltip: string): Promise<void>;

  /**
   * Register handler for tray menu item clicks
   */
  onTrayMenuClick(handler: (itemId: string) => void): () => void;

  // =========================================================================
  // WINDOW MANAGEMENT (Desktop only)
  // =========================================================================

  /**
   * Show a window by label
   */
  showWindow(label?: WindowLabel): Promise<void>;

  /**
   * Hide a window by label
   */
  hideWindow(label?: WindowLabel): Promise<void>;

  /**
   * Focus a window by label
   */
  focusWindow(label?: WindowLabel): Promise<void>;

  /**
   * Close a window by label
   */
  closeWindow(label?: WindowLabel): Promise<void>;

  /**
   * Check if a window is visible
   */
  isWindowVisible(label?: WindowLabel): Promise<boolean>;

  /**
   * Toggle window visibility
   */
  toggleWindow(label?: WindowLabel): Promise<void>;

  // =========================================================================
  // APP LIFECYCLE
  // =========================================================================

  /**
   * Quit the application
   */
  quit(): Promise<void>;

  /**
   * Restart the application
   */
  restart(): Promise<void>;

  /**
   * Get app version
   */
  getAppVersion(): Promise<string>;
}

/**
 * System error types
 */
export type SystemErrorCode =
  | 'HOTKEY_ALREADY_REGISTERED'
  | 'HOTKEY_INVALID'
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN';

/**
 * System error class for typed error handling
 */
export class SystemError extends Error {
  constructor(
    public readonly code: SystemErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SystemError';
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseHotkeyRecorderOptions {
  initialShortcut: string;
  onSave: (shortcut: string) => Promise<void>;
}

interface UseHotkeyRecorderReturn {
  hotkeyInput: string;
  hotkeyError: string | null;
  isRecordingHotkey: boolean;
  isSaving: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  hotkeyInputRef: React.RefObject<HTMLButtonElement | null>;
  formatShortcutDisplay: (shortcut: string) => string;
}

export function useHotkeyRecorder(options: UseHotkeyRecorderOptions): UseHotkeyRecorderReturn {
  const { initialShortcut, onSave } = options;

  const [hotkeyInput, setHotkeyInput] = useState(initialShortcut);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hotkeyInputRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHotkeyInput(initialShortcut);
  }, [initialShortcut]);

  const keyEventToShortcut = useCallback((e: KeyboardEvent): string | null => {
    const parts: string[] = [];

    // Add modifiers (use CommandOrControl for cross-platform)
    if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    const key = e.key;
    const code = e.code;

    const isModifierOnly = ['Control', 'Meta', 'Alt', 'Shift', 'CapsLock'].includes(key);
    if (isModifierOnly) return null;

    // Normalize key names for Tauri.
    // Use `code` for digit/letter keys so we don't record symbols like "%" (Shift+5).
    let normalizedKey = key;
    if (/^Key[A-Z]$/.test(code)) {
      normalizedKey = code.replace(/^Key/, '');
    } else if (/^Digit[0-9]$/.test(code)) {
      normalizedKey = code.replace(/^Digit/, '');
    } else if (/^F[0-9]{1,2}$/.test(key)) {
      normalizedKey = key;
    } else if (key.length === 1) {
      normalizedKey = /[a-z]/i.test(key) ? key.toUpperCase() : key;
    } else {
      const keyMap: Record<string, string> = {
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        Escape: 'Escape',
        Enter: 'Return',
        Backspace: 'Backspace',
        Delete: 'Delete',
        Tab: 'Tab',
        Space: 'Space',
        ' ': 'Space',
      };
      normalizedKey = keyMap[key] || key;
    }

    parts.push(normalizedKey);
    return parts.join('+');
  }, []);

  const formatShortcutDisplay = useCallback((shortcut: string): string => {
    return shortcut
      .replace(/CommandOrControl/g, '⌘')
      .replace(/Shift/g, '⇧')
      .replace(/Alt/g, '⌥')
      .replace(/\+/g, ' ');
  }, []);

  useEffect(() => {
    if (!isRecordingHotkey) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const shortcut = keyEventToShortcut(e);
      if (!shortcut) return;

      const hasModifier =
        shortcut.includes('CommandOrControl') || shortcut.includes('Alt') || shortcut.includes('Shift');

      if (!hasModifier) {
        setHotkeyError('Please include a modifier key (Cmd/Ctrl, Alt, or Shift)');
        return;
      }

      setHotkeyInput(shortcut);
      setHotkeyError(null);
      setIsRecordingHotkey(false);

      setIsSaving(true);
      try {
        await onSave(shortcut);
      } finally {
        setIsSaving(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (hotkeyInputRef.current && !hotkeyInputRef.current.contains(e.target as Node)) {
        setIsRecordingHotkey(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('click', handleClick);
    };
  }, [isRecordingHotkey, keyEventToShortcut, onSave]);

  const startRecording = useCallback(() => {
    setIsRecordingHotkey(true);
    if (hotkeyInputRef.current) {
      hotkeyInputRef.current.focus();
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecordingHotkey(false);
  }, []);

  return {
    hotkeyInput,
    hotkeyError,
    isRecordingHotkey,
    isSaving,
    startRecording,
    stopRecording,
    hotkeyInputRef,
    formatShortcutDisplay,
  };
}

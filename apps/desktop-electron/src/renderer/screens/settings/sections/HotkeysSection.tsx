import { useCallback } from 'react';
import { tokens } from '@taik/ui-tokens';
import { useVoiceStore } from '@taik/domain';
import { DEFAULT_HOTKEYS } from '../../../hooks/useGlobalHotkeys';
import { useHotkeyRecorder } from '../hooks/useHotkeyRecorder';
import { emit } from '../../../platform/events';
import { systemAdapter } from '../../../platform/system';

export function HotkeysSection() {
  const { settings: voiceSettings, updateSettings } = useVoiceStore();

  const initialShortcut = voiceSettings.voiceToggleHotkey || DEFAULT_HOTKEYS.toggleFloatingVoice;

  const { hotkeyInput, hotkeyError, isRecordingHotkey, isSaving, startRecording, hotkeyInputRef, formatShortcutDisplay } =
    useHotkeyRecorder({
      initialShortcut,
      onSave: async (shortcut) => {
        await updateSettings({ voiceToggleHotkey: shortcut });
      },
    });

  const handleTestVoiceToggle = useCallback(async () => {
    try {
      console.log('[Settings] Testing voice toggle...');
      const isVisible = await systemAdapter.isWindowVisible('floating-voice');
      console.log('[Settings] Voice window visible:', isVisible);

      if (!isVisible) {
        console.log('[Settings] Showing voice window...');
        await systemAdapter.showWindow('floating-voice');
        await systemAdapter.focusWindow('floating-voice');
        console.log('[Settings] Waiting for window to load...');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log('[Settings] Emitting voice:toggle-recording event...');
      await emit('voice:toggle-recording');
      console.log('[Settings] Event emitted');
    } catch (error) {
      console.error('[Settings] Test failed:', error);
    }
  }, []);

  return (
    <section style={{ marginBottom: tokens.space.xxxl }}>
      <h2
        style={{
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          marginBottom: tokens.space.lg,
        }}
      >
        Keyboard Shortcuts
      </h2>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
        }}
      >
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Toggle Voice Recording
          </label>
          <div style={{ display: 'flex', gap: tokens.space.sm, alignItems: 'center' }}>
            <button
              ref={hotkeyInputRef}
              onClick={startRecording}
              style={{
                flex: 1,
                padding: tokens.space.md,
                borderRadius: tokens.radius.sm,
                border: `2px solid ${isRecordingHotkey ? tokens.color.brand : hotkeyError ? tokens.color.danger : tokens.color.borderSubtle}`,
                backgroundColor: isRecordingHotkey ? tokens.color.surfaceAlt : tokens.color.background,
                fontSize: tokens.fontSize.md,
                fontFamily: 'system-ui',
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                color: isRecordingHotkey ? tokens.color.brand : tokens.color.text,
              }}
            >
              {isRecordingHotkey ? (
                <span style={{ animation: 'pulse 1s infinite' }}>Press shortcut keys...</span>
              ) : isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>{formatShortcutDisplay(hotkeyInput)}</span>
              )}
            </button>
            {!isRecordingHotkey && (
              <>
                <button
                  onClick={startRecording}
                  style={{
                    padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                    backgroundColor: tokens.color.surface,
                    color: tokens.color.text,
                    border: `1px solid ${tokens.color.borderSubtle}`,
                    borderRadius: tokens.radius.sm,
                    fontSize: tokens.fontSize.sm,
                    cursor: 'pointer',
                  }}
                  title="Click to record new shortcut"
                >
                  Change
                </button>
                <button
                  onClick={() => void handleTestVoiceToggle()}
                  style={{
                    padding: `${tokens.space.sm}px ${tokens.space.md}px`,
                    backgroundColor: tokens.color.brand,
                    color: 'white',
                    border: 'none',
                    borderRadius: tokens.radius.sm,
                    fontSize: tokens.fontSize.sm,
                    fontWeight: tokens.fontWeight.semibold,
                    cursor: 'pointer',
                  }}
                  title="Manually test voice toggle"
                >
                  Test
                </button>
              </>
            )}
          </div>
          {hotkeyError && (
            <p
              style={{
                fontSize: tokens.fontSize.xs,
                color: tokens.color.danger,
                marginTop: tokens.space.xs,
              }}
            >
              {hotkeyError}
            </p>
          )}
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            {isRecordingHotkey
              ? 'Press your desired key combination (e.g., Cmd+Shift+V). Click outside to cancel.'
              : 'Click to record a new shortcut. Shows voice window and toggles recording.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: tokens.fontSize.sm }}>Toggle Deck Window</span>
            <code
              style={{
                backgroundColor: tokens.color.background,
                padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.xs,
              }}
            >
              {formatShortcutDisplay(DEFAULT_HOTKEYS.toggleFloatingDeck)}
            </code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: tokens.fontSize.sm }}>Toggle Recording (in-app)</span>
            <code
              style={{
                backgroundColor: tokens.color.background,
                padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.xs,
              }}
            >
              {formatShortcutDisplay(DEFAULT_HOTKEYS.toggleRecording)}
            </code>
          </div>
        </div>
      </div>
    </section>
  );
}

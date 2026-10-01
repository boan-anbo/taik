import { useEffect, useMemo, useState } from 'react';
import { BrowserMediaDeviceAdapter } from '../../../adapters';
import { AudioDeviceSelector } from '../../../components';
import { WaveformDisplay } from '@taik/ui-dom';
import { tokens } from '@taik/ui-tokens';
import { useVoiceStore, type VoiceDisplayMode, type VoiceWidgetMode, type VoiceOutputDestination, type RecordingMode } from '@taik/domain';
import { useMicTest } from '../hooks/useMicTest';
import { useDirectInsertPermission } from '../hooks/useDirectInsertPermission';
import { systemAdapter } from '../../../platform/system';

export function VoiceInputSection() {
  const {
    settings: voiceSettings,
    updateSettings,
    setDisplayMode,
    setWidgetMode,
    setOutputDestination,
    setAutoHide,
  } = useVoiceStore();

  const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);
  const micTest = useMicTest({ deviceAdapter });
  const directInsert = useDirectInsertPermission();
  const [systemMicStatus, setSystemMicStatus] = useState<string>('unknown');

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const status = await systemAdapter.getMicrophoneAccessStatus();
        if (!cancelled) setSystemMicStatus(status);
      } catch {
        if (!cancelled) setSystemMicStatus('unknown');
      }
    };

    void refresh();
    const id = window.setInterval(() => void refresh(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
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
        Voice Input
      </h2>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
        }}
      >
        {/* Display Mode */}
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Display Mode
          </label>
          <div style={{ display: 'flex', gap: tokens.space.xs, flexWrap: 'wrap' }}>
            {(['voice', 'deck', 'combined', 'separate'] as VoiceDisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                style={{
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  backgroundColor: voiceSettings.displayMode === mode ? tokens.color.brand : tokens.color.background,
                  color: voiceSettings.displayMode === mode ? 'white' : tokens.color.text,
                  border: `1px solid ${voiceSettings.displayMode === mode ? tokens.color.brand : tokens.color.borderSubtle}`,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Voice: voice only • Deck: deck only • Combined: both in one window • Separate: two windows
          </p>
        </div>

        {/* Widget Mode */}
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Widget Complexity
          </label>
          <div style={{ display: 'flex', gap: tokens.space.xs, flexWrap: 'wrap' }}>
            {(['minimal', 'status', 'preview', 'full'] as VoiceWidgetMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setWidgetMode(mode)}
                style={{
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  backgroundColor: voiceSettings.widgetMode === mode ? tokens.color.brand : tokens.color.background,
                  color: voiceSettings.widgetMode === mode ? 'white' : tokens.color.text,
                  border: `1px solid ${voiceSettings.widgetMode === mode ? tokens.color.brand : tokens.color.borderSubtle}`,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Minimal: mic only • Status: + text • Preview: + transcript preview • Full: complete UI
          </p>
        </div>

        {/* Recording Mode */}
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Recording Mode
          </label>
          <div style={{ display: 'flex', gap: tokens.space.xs, flexWrap: 'wrap' }}>
            {(
              [
                { value: 'realtime', label: 'Realtime', desc: 'Live transcription as you speak' },
                { value: 'async', label: 'Async', desc: 'Record first, then transcribe' },
              ] as { value: RecordingMode; label: string; desc: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => void updateSettings({ recordingMode: value })}
                style={{
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  backgroundColor: voiceSettings.recordingMode === value ? tokens.color.brand : tokens.color.background,
                  color: voiceSettings.recordingMode === value ? 'white' : tokens.color.text,
                  border: `1px solid ${voiceSettings.recordingMode === value ? tokens.color.brand : tokens.color.borderSubtle}`,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Realtime: See text as you speak • Async: Record audio, then process (with waveform)
          </p>
        </div>

        {/* Audio Input Device */}
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Audio Input Device
          </label>
          <AudioDeviceSelector
            devices={micTest.devices}
            selectedDeviceId={micTest.selectedDeviceId}
            onSelect={(deviceId) => void micTest.selectDevice(deviceId)}
            hasPermission={micTest.hasPermission}
            onRequestPermission={() => void micTest.requestPermission()}
            onOpenSystemSettings={() => void systemAdapter.openMicrophonePrivacySettings()}
            systemPermissionStatus={systemMicStatus}
          />
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Select which microphone to use for voice recording
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm, marginTop: tokens.space.sm }}>
            <button
              type="button"
              onClick={() => void micTest.toggleMicTest()}
              disabled={!micTest.deviceAdapterSupported}
              style={{
                padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                backgroundColor: micTest.isMicTestOn ? tokens.color.danger : tokens.color.surface,
                color: micTest.isMicTestOn ? 'white' : tokens.color.text,
                border: `1px solid ${tokens.color.borderSubtle}`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              {micTest.isMicTestOn ? 'Stop Test' : 'Test Mic'}
            </button>

            {micTest.isMicVizActive && micTest.micVizData.waveform.length > 0 && (
              <div style={{ flex: 1, minWidth: 140 }}>
                <WaveformDisplay
                  levels={micTest.micVizData.waveform}
                  volume={micTest.micVizData.volume}
                  isActive={micTest.isMicTestOn}
                  height={24}
                  barWidth={3}
                  barGap={2}
                />
              </div>
            )}

            <div
              style={{
                fontSize: tokens.fontSize.xs,
                color: micTest.hasSignal ? tokens.color.success : tokens.color.textSubtle,
                minWidth: 90,
                textAlign: 'right',
              }}
            >
              {micTest.hasSignal ? 'Input detected' : 'No input'}
            </div>
          </div>
        </div>

        {/* Output Destination */}
        <div style={{ marginBottom: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Output Destination
          </label>
          <div style={{ display: 'flex', gap: tokens.space.xs, flexWrap: 'wrap' }}>
            {(
              [
                { value: 'insert', label: 'Auto-insert' },
                { value: 'clipboard', label: 'Clipboard' },
                { value: 'both', label: 'Both' },
                { value: 'history-only', label: 'History only' },
              ] as { value: VoiceOutputDestination; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setOutputDestination(value)}
                style={{
                  padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                  backgroundColor: voiceSettings.outputDestination === value ? tokens.color.brand : tokens.color.background,
                  color: voiceSettings.outputDestination === value ? 'white' : tokens.color.text,
                  border: `1px solid ${voiceSettings.outputDestination === value ? tokens.color.brand : tokens.color.borderSubtle}`,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Where transcribed text goes after recording
          </p>

          {directInsert.supportsDirectInsert && (voiceSettings.outputDestination === 'insert' || voiceSettings.outputDestination === 'both') && (
            <div
              style={{
                marginTop: tokens.space.sm,
                padding: tokens.space.sm,
                borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.color.borderSubtle}`,
                background: tokens.color.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: tokens.space.sm,
              }}
            >
              <div>
                <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.medium }}>
                  Direct insert (macOS Accessibility)
                </div>
                <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, marginTop: 2 }}>
                  Status:{' '}
                  {directInsert.hasDirectInsertPermission === null
                    ? 'Checking…'
                    : directInsert.hasDirectInsertPermission
                      ? 'Granted'
                      : 'Not granted'}
                </div>
                <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, marginTop: 6 }}>
                  System Settings → Privacy & Security → Accessibility → enable for this app.
                </div>
                {import.meta.env.DEV && (
                  <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle, marginTop: 2 }}>
                    Dev note: when running via `tauri dev`, macOS may attribute the permission to your terminal (e.g. Ghostty/Terminal/iTerm2).
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: tokens.space.xs, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => void directInsert.refresh()}
                  style={{
                    padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                    backgroundColor: tokens.color.surface,
                    color: tokens.color.text,
                    border: `1px solid ${tokens.color.borderSubtle}`,
                    borderRadius: tokens.radius.sm,
                    fontSize: tokens.fontSize.sm,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Refresh
                </button>
                {!directInsert.hasDirectInsertPermission && (
                  <button
                    type="button"
                    onClick={() => void directInsert.requestPermission()}
                    style={{
                      padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                      backgroundColor: tokens.color.brand,
                      color: 'white',
                      border: 'none',
                      borderRadius: tokens.radius.sm,
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.semibold,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Grant access
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Auto-hide Toggle */}
        <div style={{ marginBottom: tokens.space.md }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={voiceSettings.autoHideAfterRecording}
              onChange={(e) => setAutoHide(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm }}>
              Auto-hide window after recording
            </span>
          </label>
        </div>

        {/* Save Audio Files Toggle */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={voiceSettings.saveAudioFiles}
              onChange={(e) => void updateSettings({ saveAudioFiles: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: tokens.fontSize.sm }}>
              Save audio files for playback in history
            </span>
          </label>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
              marginLeft: 26,
            }}
          >
            When enabled, recordings can be played back from the history
          </p>
        </div>
      </div>
    </section>
  );
}

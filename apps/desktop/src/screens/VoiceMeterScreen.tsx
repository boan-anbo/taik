/**
 * Voice Meter Screen
 * Minimal floating window that shows live mic waveform.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { BrowserMediaDeviceAdapter } from '@taik/platform-web';
import { WaveformDisplay } from '@taik/ui-dom';
import { useMicTest } from './settings/hooks/useMicTest';

import './VoiceMeterScreen.css';

export function VoiceMeterScreen() {
  const deviceAdapter = useMemo(() => new BrowserMediaDeviceAdapter(), []);
  const micTest = useMicTest({ deviceAdapter });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!micTest.deviceAdapterSupported) return;
    if (!micTest.isMicTestOn) {
      void micTest.toggleMicTest();
    }
  }, [micTest.deviceAdapterSupported, micTest.isMicTestOn, micTest.toggleMicTest]);

  useEffect(() => {
    return () => {
      if (micTest.isMicTestOn) {
        void micTest.toggleMicTest();
      }
    };
  }, [micTest.isMicTestOn, micTest.toggleMicTest]);

  const startDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, [data-no-drag]')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    const window = getCurrentWindow();
    await window.startDragging();
    setIsDragging(false);
  }, []);

  const hideWindow = useCallback(async () => {
    const window = getCurrentWindow();
    await window.hide();
  }, []);

  const hasWaveform = micTest.isMicVizActive && micTest.micVizData.waveform.length > 0;
  const statusLabel = micTest.hasPermission
    ? micTest.hasSignal
      ? 'Input detected'
      : 'No input'
    : 'Mic permission required';

  return (
    <div className="voice-meter-screen" onMouseDown={startDrag}>
      <button
        className="voice-meter-close"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={hideWindow}
        title="Hide"
      >
        ×
      </button>
      <div className={`voice-meter-shell ${isDragging ? 'dragging' : ''}`}>
        <div className="voice-meter-title">Mic Meter</div>
        <div className="voice-meter-waveform">
          <WaveformDisplay
            levels={hasWaveform ? micTest.micVizData.waveform : []}
            volume={micTest.micVizData.volume}
            isActive={micTest.isMicTestOn}
            height={36}
            barWidth={3}
            barGap={2}
            minBarHeight={0.08}
          />
        </div>
        <div className={`voice-meter-status ${micTest.hasSignal ? 'active' : ''}`}>
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

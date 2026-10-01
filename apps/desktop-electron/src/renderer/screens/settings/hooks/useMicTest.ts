import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudioStreamManager, useAudioVisualization } from '@taik/domain';
import type { IMediaDeviceAdapter } from '@taik/capabilities';

interface UseMicTestOptions {
  deviceAdapter: IMediaDeviceAdapter;
}

export function useMicTest(options: UseMicTestOptions) {
  const { deviceAdapter } = options;

  const streamManager = useAudioStreamManager({
    deviceAdapter,
    autoRequestPermission: false,
  });

  const {
    devices,
    selectedDeviceId,
    stream,
    hasPermission,
    selectDevice,
    requestPermission,
    startStream,
    stopStream,
  } = streamManager;

  const micViz = useAudioVisualization({ barCount: 24, updateInterval: 50 });
  const { data: micVizData, isActive: isMicVizActive, connect: connectMicViz, disconnect: disconnectMicViz } =
    micViz;

  const [isMicTestOn, setIsMicTestOn] = useState(false);

  const deviceAdapterSupported = useMemo(() => {
    try {
      return deviceAdapter.isSupported();
    } catch {
      return false;
    }
  }, [deviceAdapter]);

  useEffect(() => {
    if (isMicTestOn && stream) {
      connectMicViz(stream);
    }
  }, [isMicTestOn, stream, connectMicViz]);

  const toggleMicTest = useCallback(async () => {
    if (isMicTestOn) {
      setIsMicTestOn(false);
      disconnectMicViz();
      stopStream();
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const nextStream = await startStream();
    connectMicViz(nextStream);
    setIsMicTestOn(true);
  }, [connectMicViz, disconnectMicViz, hasPermission, isMicTestOn, requestPermission, startStream, stopStream]);

  const hasSignal = isMicVizActive && micVizData.volume > 0.02;

  return {
    deviceAdapterSupported,
    devices,
    selectedDeviceId,
    selectDevice,
    hasPermission,
    requestPermission,
    isMicTestOn,
    toggleMicTest,
    isMicVizActive,
    micVizData,
    hasSignal,
  };
}


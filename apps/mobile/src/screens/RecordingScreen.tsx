/**
 * Recording Screen
 * Main UI for speech-to-text recording
 * Matches the Swift prototype's RecordingView
 */

import React from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SharedStorage from '../../modules/shared-storage/src';
import { useRecording } from '../hooks/useRecording';
import { RecordingScreenView } from './RecordingScreenView';

// TODO: Move to secure storage
const SONIOX_API_KEY = process.env.EXPO_PUBLIC_SONIOX_API_KEY ?? '';

export function RecordingScreen() {
  const {
    state,
    partialText,
    finalText,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useRecording({
    apiKey: SONIOX_API_KEY,
    languageHints: ['en'],
    enableSpeakerDiarization: false,
    onStart: () => {
      console.log('Recording started');
    },
    onStop: () => {
      console.log('Recording stopped');
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  /**
   * Handle mic button press
   */
  const handleMicPress = async () => {
    if (state === 'recording') {
      await stopRecording();
    } else if (state === 'idle' || state === 'completed' || state === 'error') {
      await startRecording();
    }
  };

  /**
   * Copy transcript to clipboard
   */
  const handleCopyToClipboard = async () => {
    if (finalText) {
      await Clipboard.setStringAsync(finalText);
      Alert.alert('Copied', 'Transcript copied to clipboard');
    }
  };

  /**
   * Send to keyboard (via SharedStorage)
   */
  const handleSendToKeyboard = async () => {
    if (finalText) {
      try {
        await SharedStorage.setPendingTranscription(finalText);
        Alert.alert(
          'Ready to Insert',
          'Switch to any app and use the Taik keyboard to insert your transcription.'
        );
      } catch (err) {
        Alert.alert('Error', 'Failed to save transcription for keyboard insertion');
      }
    }
  };

  /**
   * Get status text based on state
   */
  const getStatusText = (): string => {
    switch (state) {
      case 'starting':
        return 'Starting...';
      case 'recording':
        return 'Listening... Tap to stop';
      case 'stopping':
        return 'Processing...';
      case 'completed':
        return 'Tap to record again';
      case 'error':
        return 'Error occurred. Tap to retry';
      default:
        return 'Tap to start recording';
    }
  };

  return (
    <RecordingScreenView
      state={state}
      partialText={partialText}
      finalText={finalText}
      error={error}
      onMicPress={handleMicPress}
      onDismissError={reset}
      onSendToKeyboard={handleSendToKeyboard}
      onCopyToClipboard={handleCopyToClipboard}
    />
  );
}

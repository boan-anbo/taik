/**
 * File Transcription Screen (Container)
 * Handles business logic and delegates rendering to FileTranscriptionScreenView
 */

import React, { useState, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import SharedStorage from '../../modules/shared-storage/src';
import { useFileTranscription } from '../hooks/useFileTranscription';
import { FileTranscriptionScreenView } from './FileTranscriptionScreenView';

// Only import DocumentPicker on native platforms
let DocumentPicker: typeof import('expo-document-picker') | null = null;
if (Platform.OS !== 'web') {
  DocumentPicker = require('expo-document-picker');
}

const SONIOX_API_KEY = process.env.EXPO_PUBLIC_SONIOX_API_KEY ?? '';

export function FileTranscriptionScreen() {
  const [audioUrl, setAudioUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state,
    progress,
    text,
    audioDurationMs,
    error,
    transcribeUrl,
    transcribeFile,
    cancel,
    reset,
  } = useFileTranscription({
    apiKey: SONIOX_API_KEY,
    languageHints: ['en'],
    enableSpeakerDiarization: false,
    onStart: () => {
      console.log('File transcription started');
    },
    onComplete: (result) => {
      console.log('File transcription completed:', result.text.substring(0, 100));
    },
    onError: (err) => {
      Alert.alert('Transcription Error', err.message);
    },
  });

  /**
   * Handle URL transcription
   */
  const handleTranscribeUrl = async () => {
    if (!audioUrl.trim()) {
      Alert.alert('Error', 'Please enter an audio URL');
      return;
    }

    // Basic URL validation
    if (!audioUrl.match(/^https?:\/\/.+/)) {
      Alert.alert('Error', 'Please enter a valid HTTP/HTTPS URL');
      return;
    }

    await transcribeUrl(audioUrl.trim());
  };

  /**
   * Handle file picker - Web version
   */
  const handleWebFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      await transcribeFile(arrayBuffer, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      Alert.alert('Error', message);
    }
  };

  /**
   * Handle file picker
   */
  const handlePickFile = async () => {
    // On web, trigger the hidden file input
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    // On native, use DocumentPicker
    if (!DocumentPicker) {
      Alert.alert('Error', 'File picker not available');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      // Read file as blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      await transcribeFile(blob, file.name || 'audio.mp3');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pick file';
      Alert.alert('Error', message);
    }
  };

  /**
   * Copy transcript to clipboard
   */
  const handleCopyToClipboard = async () => {
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Transcript copied to clipboard');
    }
  };

  /**
   * Send to keyboard (via SharedStorage)
   */
  const handleSendToKeyboard = async () => {
    if (text) {
      try {
        await SharedStorage.setPendingTranscription(text);
        Alert.alert(
          'Ready to Insert',
          'Switch to any app and use the Taik keyboard to insert your transcription.'
        );
      } catch (err) {
        Alert.alert('Error', 'Failed to save transcription for keyboard insertion');
      }
    }
  };

  return (
    <>
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleWebFileChange as any}
        />
      )}
      <FileTranscriptionScreenView
        state={state}
        progress={progress}
        text={text}
        audioDurationMs={audioDurationMs}
        error={error}
        audioUrl={audioUrl}
        onAudioUrlChange={setAudioUrl}
        onTranscribeUrl={handleTranscribeUrl}
        onPickFile={handlePickFile}
        onCancel={cancel}
        onReset={reset}
        onCopyToClipboard={handleCopyToClipboard}
        onSendToKeyboard={handleSendToKeyboard}
      />
    </>
  );
}

/**
 * File Transcription Screen (View)
 * Pure/presentational component for Storybook-friendly iteration.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { tokens } from '@taik/ui-tokens';
import { Button, Text, Input, ErrorAlert, ProgressBar } from '@taik/ui-rn';
import { TranscriptView } from '../components/TranscriptView';

export type FileTranscriptionState = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface FileTranscriptionScreenViewProps {
  state: FileTranscriptionState;
  progress: number;
  text: string;
  audioDurationMs: number;
  error: string | null;
  audioUrl: string;
  onAudioUrlChange: (url: string) => void;
  onTranscribeUrl: () => void;
  onPickFile: () => void;
  onCancel: () => void;
  onReset: () => void;
  onCopyToClipboard: () => void;
  onSendToKeyboard: () => void;
}

export function FileTranscriptionScreenView({
  state,
  progress,
  text,
  audioDurationMs,
  error,
  audioUrl,
  onAudioUrlChange,
  onTranscribeUrl,
  onPickFile,
  onCancel,
  onReset,
  onCopyToClipboard,
  onSendToKeyboard,
}: FileTranscriptionScreenViewProps) {
  const isProcessing = state === 'uploading' || state === 'processing';

  /**
   * Format duration for display
   */
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /**
   * Get status message based on state
   */
  const getStatusMessage = (): string => {
    switch (state) {
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return `Processing... ${Math.round(progress)}%`;
      case 'completed':
        return `Completed • Duration: ${formatDuration(audioDurationMs)}`;
      case 'error':
        return 'Transcription failed';
      default:
        return 'Upload a file or enter a URL to transcribe';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input Section */}
        <View style={styles.section}>
          <Text variant="label" weight="semibold" color={tokens.color.text}>
            From URL
          </Text>
          <View style={styles.inputWrapper}>
            <Input
              value={audioUrl}
              onChangeText={onAudioUrlChange}
              placeholder="https://example.com/audio.mp3"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isProcessing}
            />
          </View>
          <Button
            variant="primary"
            fullWidth
            onPress={onTranscribeUrl}
            disabled={isProcessing}
          >
            Transcribe URL
          </Button>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text variant="caption" color={tokens.color.secondaryLabel}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* File Upload Section */}
        <View style={styles.section}>
          <Text variant="label" weight="semibold" color={tokens.color.text}>
            From File
          </Text>
          <Button
            variant="secondary"
            fullWidth
            onPress={onPickFile}
            disabled={isProcessing}
          >
            <View style={styles.uploadContent}>
              <Text variant="title" align="center">📁</Text>
              <Text variant="body" weight="semibold" align="center">Choose Audio File</Text>
              <Text variant="caption" color={tokens.color.secondaryLabel} align="center">
                MP3, WAV, M4A, FLAC, etc.
              </Text>
            </View>
          </Button>
        </View>

        {/* Progress Indicator */}
        {isProcessing && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color={tokens.color.brand} />
            <Text variant="body" color={tokens.color.textSubtle} style={styles.progressText}>
              {getStatusMessage()}
            </Text>
            <View style={styles.progressBarWrapper}>
              <ProgressBar progress={progress} />
            </View>
            <Button variant="tertiary" onPress={onCancel}>
              <Text variant="body" weight="medium" color={tokens.color.danger}>Cancel</Text>
            </Button>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <ErrorAlert
            message={error}
            onDismiss={onReset}
            dismissLabel="Dismiss"
          />
        )}

        {/* Transcript Display */}
        {text && state === 'completed' && (
          <View style={styles.transcriptSection}>
            <View style={styles.transcriptHeader}>
              <Text variant="label" weight="semibold" color={tokens.color.text}>
                Transcript
              </Text>
              <Text variant="caption" color={tokens.color.secondaryLabel}>
                {formatDuration(audioDurationMs)}
              </Text>
            </View>
            <TranscriptView
              partialText=""
              finalText={text}
              isListening={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Action Buttons (when completed) */}
      {text && state === 'completed' && (
        <View style={styles.footer}>
          <View style={styles.actionButtons}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={onSendToKeyboard}
            >
              Insert via Keyboard
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onPress={onCopyToClipboard}
            >
              Copy to Clipboard
            </Button>

            <Button
              variant="tertiary"
              fullWidth
              onPress={onReset}
            >
              Transcribe Another
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: tokens.space.screenPadding,
    paddingBottom: 40,
  },
  section: {
    marginBottom: tokens.space.xxl,
  },
  inputWrapper: {
    marginVertical: tokens.space.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: tokens.space.sm,
    marginBottom: tokens.space.xxl,
    paddingHorizontal: tokens.space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.color.separator,
  },
  uploadContent: {
    alignItems: 'center',
    paddingVertical: tokens.space.lg,
  },
  progressContainer: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.xxl,
    alignItems: 'center',
    marginBottom: tokens.space.xxl,
  },
  progressText: {
    marginTop: tokens.space.md,
    marginBottom: tokens.space.lg,
  },
  progressBarWrapper: {
    width: '100%',
    marginBottom: tokens.space.lg,
  },
  transcriptSection: {
    marginTop: tokens.space.sm,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.md,
  },
  footer: {
    paddingHorizontal: tokens.space.screenPadding,
    paddingBottom: 40,
    backgroundColor: tokens.color.background,
    borderTopWidth: 1,
    borderTopColor: tokens.color.surface,
    paddingTop: tokens.space.lg,
  },
  actionButtons: {
    gap: tokens.space.md,
  },
});

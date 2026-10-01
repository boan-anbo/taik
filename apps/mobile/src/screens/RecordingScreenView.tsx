/**
 * Recording Screen (View)
 * Pure/presentational component for Storybook-friendly iteration.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import { Button, Text, ErrorAlert } from '@taik/ui-rn';
import { MicButton } from '../components/MicButton';
import { TranscriptView } from '../components/TranscriptView';

export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'completed' | 'error';

export interface RecordingScreenViewProps {
  state: RecordingState;
  partialText: string;
  finalText: string;
  error: string | null;
  onMicPress: () => void;
  onDismissError: () => void;
  onSendToKeyboard: () => void;
  onCopyToClipboard: () => void;
}

export function RecordingScreenView({
  state,
  partialText,
  finalText,
  error,
  onMicPress,
  onDismissError,
  onSendToKeyboard,
  onCopyToClipboard,
}: RecordingScreenViewProps) {
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
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {(partialText || finalText) && (
          <TranscriptView
            partialText={partialText}
            finalText={finalText}
            isListening={state === 'recording'}
          />
        )}

        {error && (
          <ErrorAlert
            message={error}
            onDismiss={onDismissError}
            dismissLabel="Dismiss"
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text variant="body" color={tokens.color.textSubtle} style={styles.statusText}>
          {getStatusText()}
        </Text>

        <MicButton
          state={state}
          onPress={onMicPress}
          disabled={state === 'starting' || state === 'stopping'}
        />

        {finalText && state === 'completed' && (
          <View style={styles.actionButtons}>
            <Button
              testID="button-keyboard"
              variant="primary"
              size="lg"
              fullWidth
              onPress={onSendToKeyboard}
            >
              Insert via Keyboard
            </Button>

            <Button
              testID="button-clipboard"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={onCopyToClipboard}
            >
              Copy to Clipboard
            </Button>
          </View>
        )}
      </View>
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
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: tokens.space.screenPadding,
    paddingBottom: 40,
    alignItems: 'center',
  },
  statusText: {
    marginBottom: tokens.space.xl,
  },
  actionButtons: {
    width: '100%',
    marginTop: tokens.space.xxl,
    gap: tokens.space.md,
  },
});


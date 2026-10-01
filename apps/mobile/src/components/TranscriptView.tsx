/**
 * Transcript View Component
 * Displays partial and final transcription text
 * Matches the Swift prototype's transcription display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';

interface TranscriptViewProps {
  /** Interim/partial transcript (while recording) */
  partialText: string;
  /** Final transcript text */
  finalText: string;
  /** Whether currently listening */
  isListening: boolean;
}

export function TranscriptView({
  partialText,
  finalText,
  isListening,
}: TranscriptViewProps) {
  // Show partial text while listening, otherwise show final
  const showPartial = isListening && partialText;
  const showFinal = finalText && !isListening;

  if (!partialText && !finalText) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Final transcript */}
      {finalText && (
        <View style={styles.section}>
          <Text style={styles.label}>Transcription</Text>
          <View style={styles.textContainer}>
            <Text style={styles.finalText}>{finalText}</Text>
          </View>
        </View>
      )}

      {/* Partial transcript (only while listening) */}
      {showPartial && (
        <View style={styles.section}>
          <Text style={styles.label}>Listening...</Text>
          <View style={[styles.textContainer, styles.partialContainer]}>
            <Text style={styles.partialText}>{partialText}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.color.textSubtle,
    marginBottom: 8,
  },
  textContainer: {
    backgroundColor: tokens.color.surface,
    padding: 16,
    borderRadius: tokens.radius.md,
  },
  partialContainer: {
    backgroundColor: tokens.color.surfaceAlt,
    borderWidth: 1,
    borderColor: tokens.color.borderSubtle,
  },
  finalText: {
    fontSize: tokens.fontSize.lg,
    lineHeight: tokens.lineHeight.body,
    color: tokens.color.text,
  },
  partialText: {
    fontSize: tokens.fontSize.lg,
    lineHeight: tokens.lineHeight.body,
    color: tokens.color.textSubtle,
    fontStyle: 'italic',
  },
});

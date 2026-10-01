/**
 * Settings Screen (View)
 * Pure/presentational component for Storybook-friendly iteration.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import { Button, Text, Section, ListRow, RadioButton } from '@taik/ui-rn';
import type { SpeechEngineId, SpeechEngineSettings, FlowSessionState } from '../types/ipc';

// Local view props interface using the actual app types
export interface SettingsScreenViewProps {
  engineSettings: SpeechEngineSettings;
  availableEngines: SpeechEngineId[];
  session: FlowSessionState;
  timeRemaining: number | null;
  isLoading: boolean;
  onEngineSelect: (engine: SpeechEngineId) => void;
  onFlowSessionToggle: () => void;
  onShowApiKeyModal: () => void;
  onShowLanguageModal: () => void;
}

// Helper functions (moved from container for display logic)
const getEngineDisplayName = (engine: SpeechEngineId): string => {
  switch (engine) {
    case 'soniox': return 'Soniox';
    case 'apple': return 'Apple Speech';
    case 'whisper': return 'Whisper';
  }
};

const getEngineDescription = (engine: SpeechEngineId): string => {
  switch (engine) {
    case 'soniox': return 'Cloud-based, real-time transcription';
    case 'apple': return 'On-device, privacy-focused';
    case 'whisper': return 'On-device, open-source AI';
  }
};

const formatTimeRemaining = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function SettingsScreenView({
  engineSettings,
  availableEngines,
  session,
  timeRemaining,
  isLoading,
  onEngineSelect,
  onFlowSessionToggle,
  onShowApiKeyModal,
  onShowLanguageModal,
}: SettingsScreenViewProps) {

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Flow Session Section */}
        <Section title="Flow Session">
          <ListRow
            title={session.active ? 'Active' : 'Inactive'}
            subtitle={
              session.active && timeRemaining !== null
                ? `${formatTimeRemaining(timeRemaining)} remaining`
                : session.active
                  ? 'Session active'
                  : 'Enable to record from keyboard'
            }
            accessoryRight={
              <Button
                variant={session.active ? 'recording' : 'primary'}
                size="sm"
                onPress={onFlowSessionToggle}
              >
                {session.active ? 'End' : 'Start'}
              </Button>
            }
          />
        </Section>

        {/* Speech Engine Section */}
        <Section title="Speech Engine">
          {availableEngines.map((engine, index) => (
            <ListRow
              key={engine}
              title={getEngineDisplayName(engine)}
              subtitle={getEngineDescription(engine)}
              showTopBorder={index > 0}
              onPress={() => onEngineSelect(engine)}
              accessoryRight={
                <RadioButton
                  selected={engineSettings.preferredEngine === engine}
                  onPress={() => onEngineSelect(engine)}
                />
              }
            />
          ))}
        </Section>

        {/* Soniox API Key */}
        <Section title="Soniox">
          <ListRow
            title="API Key"
            subtitle={
              engineSettings.sonioxApiKey
                ? '••••••••' + engineSettings.sonioxApiKey.slice(-4)
                : 'Not set'
            }
            showChevron
            onPress={onShowApiKeyModal}
          />
        </Section>

        {/* Language Settings */}
        <Section title="Language">
          <ListRow
            title="Recognition Language"
            subtitle={engineSettings.languageHints.join(', ') || 'Auto-detect'}
            showChevron
            onPress={onShowLanguageModal}
          />
        </Section>

        {/* About Section */}
        <Section title="About">
          <ListRow
            title="Version"
            value="0.1.0"
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.groupedBackground,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: tokens.space.lg,
    paddingBottom: 40,
  },
});

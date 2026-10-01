/**
 * Settings Screen (Container)
 * Handles business logic and delegates rendering to SettingsScreenView
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Modal } from 'react-native';
import {
  useSettingsStore,
  useFlowSessionStore,
} from '../stores';
import type { SpeechEngineId } from '../types/ipc';
import { SettingsScreenView } from './SettingsScreenView';
import { ApiKeyEditor, LanguageSelector } from '@taik/ui-rn';

export function SettingsScreen() {
  const {
    engineSettings,
    availableEngines,
    isLoading,
    error,
    loadSettings,
    setPreferredEngine,
    setSonioxApiKey,
    setLanguageHints,
    clearError,
  } = useSettingsStore();

  const {
    session,
    timeRemaining,
    startSession,
    endSession,
  } = useFlowSessionStore();

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleEngineSelect = useCallback(
    (engine: SpeechEngineId) => {
      // Check requirements before selecting
      if (engine === 'soniox' && !engineSettings.sonioxApiKey) {
        Alert.alert(
          'API Key Required',
          'Please set your Soniox API key first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Set Key', onPress: () => setShowApiKeyModal(true) },
          ]
        );
        return;
      }

      if (engine === 'whisper' && engineSettings.whisperModel?.status !== 'downloaded') {
        Alert.alert(
          'Model Required',
          'Please download a Whisper model first.',
          [{ text: 'OK' }]
        );
        return;
      }

      setPreferredEngine(engine);
    },
    [engineSettings, setPreferredEngine]
  );

  const handleFlowSessionToggle = useCallback(() => {
    if (session.active) {
      Alert.alert(
        'End Flow Session',
        'Are you sure you want to end the current Flow session?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End Session', style: 'destructive', onPress: endSession },
        ]
      );
    } else {
      startSession();
    }
  }, [session.active, startSession, endSession]);

  return (
    <>
      <SettingsScreenView
        engineSettings={engineSettings}
        availableEngines={availableEngines}
        session={session}
        timeRemaining={timeRemaining}
        isLoading={isLoading}
        onEngineSelect={handleEngineSelect}
        onFlowSessionToggle={handleFlowSessionToggle}
        onShowApiKeyModal={() => setShowApiKeyModal(true)}
        onShowLanguageModal={() => setShowLanguageModal(true)}
      />

      {/* API Key Modal */}
      <Modal
        visible={showApiKeyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <ApiKeyEditor
          currentKey={engineSettings.sonioxApiKey}
          onSave={(key) => {
            setSonioxApiKey(key);
            setShowApiKeyModal(false);
          }}
          onCancel={() => setShowApiKeyModal(false)}
          title="Soniox API Key"
          placeholder="Enter your Soniox API key"
          helpText="Get your API key from soniox.com"
        />
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <LanguageSelector
          currentLanguages={engineSettings.languageHints}
          availableLanguages={[
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'zh', name: 'Chinese' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
          ]}
          onSave={(languages) => {
            setLanguageHints(languages);
            setShowLanguageModal(false);
          }}
          onCancel={() => setShowLanguageModal(false)}
          helpText="Select languages for speech recognition. Leave empty for auto-detection."
        />
      </Modal>
    </>
  );
}

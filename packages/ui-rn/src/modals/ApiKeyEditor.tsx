/**
 * ApiKeyEditor Modal Component
 * For editing API keys with secure entry
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { ApiKeyEditorProps } from '../types';
import { ModalHeader } from '../components/ModalHeader';
import { Input } from '../components/Input';

export function ApiKeyEditor({
  currentKey,
  onSave,
  onCancel,
  title = 'API Key',
  placeholder = 'Enter your API key',
  helpText = 'Your API key will be stored securely on this device.',
}: ApiKeyEditorProps) {
  const [apiKey, setApiKey] = useState(currentKey ?? '');

  const handleSave = () => {
    onSave(apiKey.trim());
  };

  return (
    <View style={styles.container}>
      <ModalHeader
        title={title}
        onCancel={onCancel}
        onSave={handleSave}
        saveDisabled={!apiKey.trim()}
      />
      <ScrollView style={styles.body}>
        <Input
          label="API Key"
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          autoFocus
          helpText={helpText}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.color.groupedBackground,
  },
  body: {
    flex: 1,
    padding: tokens.space.lg,
  },
});

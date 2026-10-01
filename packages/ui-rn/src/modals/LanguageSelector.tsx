/**
 * LanguageSelector Modal Component
 * For selecting speech recognition languages
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { LanguageSelectorProps } from '../types';
import { ModalHeader } from '../components/ModalHeader';
import { Card } from '../components/Card';

// Default available languages
const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export function LanguageSelector({
  currentLanguages,
  availableLanguages = DEFAULT_LANGUAGES,
  onSave,
  onCancel,
  allowMultiple = true,
  helpText = 'Select languages for speech recognition. Leave empty for auto-detection.',
}: LanguageSelectorProps) {
  const [selected, setSelected] = useState<string[]>(currentLanguages);

  const toggleLanguage = (code: string) => {
    if (allowMultiple) {
      setSelected((prev) =>
        prev.includes(code)
          ? prev.filter((c) => c !== code)
          : [...prev, code]
      );
    } else {
      setSelected(prev => prev.includes(code) ? [] : [code]);
    }
  };

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <View style={styles.container}>
      <ModalHeader
        title="Languages"
        onCancel={onCancel}
        onSave={handleSave}
      />
      <ScrollView style={styles.body}>
        {helpText && <Text style={styles.helpText}>{helpText}</Text>}
        <Card>
          {availableLanguages.map((lang, index) => (
            <Pressable
              key={lang.code}
              style={[styles.row, index > 0 && styles.rowBorder]}
              onPress={() => toggleLanguage(lang.code)}
            >
              <Text style={styles.rowTitle}>{lang.name}</Text>
              <View style={styles.checkbox}>
                {selected.includes(lang.code) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </Pressable>
          ))}
        </Card>
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
  helpText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.color.secondaryLabel,
    marginBottom: tokens.space.lg,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.lg,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.separator,
  },
  rowTitle: {
    fontSize: tokens.fontSize.xl,
    color: tokens.color.black,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: tokens.color.brand,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

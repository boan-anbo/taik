/**
 * ButtonEditor Modal Component
 * For editing deck buttons
 */

import React, { useState } from 'react';
import { View, Switch, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { tokens } from '@taik/ui-tokens';
import type { DeckButton, ButtonAction } from '@taik/domain';
import type { ButtonEditorProps } from '../types';
import { ModalHeader } from '../components/ModalHeader';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ListRow } from '../components/ListRow';
import { Card } from '../components/Card';

export function ButtonEditor({
  button,
  isNew,
  onSave,
  onDelete,
  onCancel,
}: ButtonEditorProps<DeckButton>) {
  const [label, setLabel] = useState(button.label);
  const [text, setText] = useState(
    button.action.type === 'insertText' ? button.action.text : ''
  );
  const [showInStrip, setShowInStrip] = useState(button.showInStrip);

  const handleSave = () => {
    const action: ButtonAction = { type: 'insertText', text };
    onSave({
      ...button,
      label,
      action,
      showInStrip,
    });
  };

  const canSave = label.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ModalHeader
        title={isNew ? 'New Button' : 'Edit Button'}
        onCancel={onCancel}
        onSave={handleSave}
        saveDisabled={!canSave}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.body}>
        <Input
          label="Label"
          value={label}
          onChangeText={setLabel}
          placeholder="Button label"
          autoFocus={isNew}
        />

        <Input
          label="Text to Insert"
          value={text}
          onChangeText={setText}
          placeholder="Text that will be inserted when pressed"
          multiline
          numberOfLines={4}
        />

        <Card>
          <ListRow
            title="Show in Keyboard Strip"
            accessoryRight={
              <Switch
                value={showInStrip}
                onValueChange={setShowInStrip}
                trackColor={{ false: tokens.color.systemGray5, true: tokens.color.success }}
                thumbColor={tokens.color.white}
              />
            }
          />
        </Card>

        {!isNew && (
          <View style={styles.deleteContainer}>
            <Button
              variant="danger"
              onPress={() => onDelete(button.id)}
              fullWidth
            >
              Delete Button
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  body: {
    padding: tokens.space.lg,
    paddingBottom: 40,
  },
  deleteContainer: {
    paddingTop: tokens.space.xxl,
  },
});

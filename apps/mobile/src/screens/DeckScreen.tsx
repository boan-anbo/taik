/**
 * Deck Screen (Container)
 * Handles business logic and delegates rendering to DeckScreenView
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Modal } from 'react-native';
import { useDeckStore } from '../stores';
import { DeckScreenView } from './DeckScreenView';
import { ButtonEditor } from '@taik/ui-rn';
import type { DeckButton } from '../types/ipc';

export function DeckScreen() {
  const {
    buttons,
    isLoading,
    error,
    loadButtons,
    addButton,
    updateButton,
    deleteButton,
    initializeDefaults,
    clearError,
  } = useDeckStore();

  const [editingButton, setEditingButton] = useState<DeckButton | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadButtons().then(() => {
      initializeDefaults();
    });
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleAddButton = useCallback(() => {
    setIsAddingNew(true);
    setEditingButton({
      id: `button-${Date.now()}`,
      label: '',
      action: { type: 'insertText', text: '' },
      showInStrip: false,
      order: buttons.length,
    });
  }, [buttons.length]);

  const handleEditButton = useCallback((button: DeckButton) => {
    setIsAddingNew(false);
    setEditingButton(button);
  }, []);

  const handleSaveButton = useCallback(
    async (button: DeckButton) => {
      if (!button.label.trim()) {
        Alert.alert('Error', 'Button label is required');
        return;
      }

      if (isAddingNew) {
        await addButton(button);
      } else {
        await updateButton(button);
      }
      setEditingButton(null);
    },
    [isAddingNew, addButton, updateButton]
  );

  const handleDeleteButton = useCallback(
    async (buttonId: string) => {
      Alert.alert('Delete Button', 'Are you sure you want to delete this button?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteButton(buttonId);
            setEditingButton(null);
          },
        },
      ]);
    },
    [deleteButton]
  );

  return (
    <>
      <DeckScreenView
        buttons={buttons}
        isLoading={isLoading}
        onAddButton={handleAddButton}
        onEditButton={handleEditButton}
      />

      {/* Edit Modal */}
      <Modal
        visible={editingButton !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingButton(null)}
      >
        {editingButton && (
          <ButtonEditor
            button={editingButton}
            isNew={isAddingNew}
            onSave={handleSaveButton}
            onDelete={handleDeleteButton}
            onCancel={() => setEditingButton(null)}
          />
        )}
      </Modal>
    </>
  );
}

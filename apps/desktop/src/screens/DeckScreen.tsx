/**
 * Deck Screen
 * Manage quick-action deck buttons
 */

import { useState, useCallback } from 'react';
import { Window } from '@tauri-apps/api/window';
import { useDeckStore, type DeckButton } from '@taik/domain';
import { tokens } from '@taik/ui-tokens';

type EditingButton = Omit<DeckButton, 'order'> | null;

export function DeckScreen() {
  const { buttons, addButton, updateButton, deleteButton, isLoading, error } =
    useDeckStore();
  const [editingButton, setEditingButton] = useState<EditingButton>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDeleteButtonId, setPendingDeleteButtonId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateNew = useCallback(() => {
    setIsCreating(true);
    setPendingDeleteButtonId(null);
    setFormError(null);
    setEditingButton({
      id: `button-${Date.now()}`,
      label: '',
      action: { type: 'insertText', text: '' },
      showInStrip: true,
    });
  }, []);

  const handleEdit = useCallback((button: DeckButton) => {
    setIsCreating(false);
    setPendingDeleteButtonId(null);
    setFormError(null);
    setEditingButton(button);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingButton) return;

    if (!editingButton.label.trim()) {
      setFormError('Please enter a label.');
      return;
    }

    if (
      editingButton.action.type === 'insertText' &&
      !editingButton.action.text.trim()
    ) {
      setFormError('Please enter text to insert.');
      return;
    }

    if (isCreating) {
      await addButton(editingButton);
    } else {
      const existingButton = buttons.find((b) => b.id === editingButton.id);
      if (existingButton) {
        await updateButton({ ...editingButton, order: existingButton.order });
      }
    }

    setEditingButton(null);
    setIsCreating(false);
    setPendingDeleteButtonId(null);
    setFormError(null);
  }, [editingButton, isCreating, addButton, updateButton, buttons]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (pendingDeleteButtonId !== id) {
        setPendingDeleteButtonId(id);
        return;
      }
      await deleteButton(id);
      setPendingDeleteButtonId(null);
      if (editingButton?.id === id) {
        setEditingButton(null);
      }
      setIsCreating(false);
    },
    [deleteButton, editingButton?.id, pendingDeleteButtonId]
  );

  const handleCancel = useCallback(() => {
    setEditingButton(null);
    setIsCreating(false);
    setPendingDeleteButtonId(null);
    setFormError(null);
  }, []);

  const openFloatingDeck = useCallback(async () => {
    try {
      const floatingDeckWindow = new Window('floating-deck');
      await floatingDeckWindow.show();
    } catch (error) {
      console.error('Failed to open floating deck:', error);
    }
  }, []);

  return (
    <div className="screen">
      <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="screen-title">Deck</h1>
        <div style={{ display: 'flex', gap: tokens.space.sm }}>
          <button
            onClick={openFloatingDeck}
            style={{
              padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
              backgroundColor: tokens.color.systemGray4,
              color: tokens.color.text,
              border: 'none',
              borderRadius: tokens.radius.sm,
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Open Floating Deck
          </button>
          <button
            onClick={handleCreateNew}
            style={{
              padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
              backgroundColor: tokens.color.brand,
              color: 'white',
              border: 'none',
              borderRadius: tokens.radius.sm,
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.semibold,
              cursor: 'pointer',
            }}
          >
            + New Button
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: tokens.color.dangerSurface,
            padding: tokens.space.md,
            borderRadius: tokens.radius.sm,
            marginBottom: tokens.space.lg,
          }}
        >
          <p style={{ color: tokens.color.danger, fontSize: tokens.fontSize.sm }}>
            {error}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: tokens.space.xl }}>
        {/* Button List */}
        <div style={{ flex: 1 }}>
          {isLoading ? (
            <p style={{ color: tokens.color.textSubtle }}>Loading...</p>
          ) : buttons.length === 0 ? (
            <div
              style={{
                padding: tokens.space.xxxl,
                textAlign: 'center',
                color: tokens.color.textSubtle,
                backgroundColor: tokens.color.surface,
                borderRadius: tokens.radius.md,
              }}
            >
              <p>No buttons yet.</p>
              <p style={{ marginTop: tokens.space.sm }}>
                Create your first button to get started.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: tokens.space.md,
              }}
            >
              {buttons.map((button) => (
                <div
                  key={button.id}
                  style={{
                    padding: tokens.space.lg,
                    backgroundColor:
                      editingButton?.id === button.id
                        ? tokens.color.surfaceAlt
                        : tokens.color.surface,
                    borderRadius: tokens.radius.md,
                    border: `1px solid ${
                      editingButton?.id === button.id
                        ? tokens.color.brand
                        : tokens.color.borderSubtle
                    }`,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEdit(button)}
                >
                  <div
                    style={{
                      fontSize: tokens.fontSize.lg,
                      fontWeight: tokens.fontWeight.semibold,
                      marginBottom: tokens.space.sm,
                    }}
                  >
                    {button.icon && <span style={{ marginRight: 8 }}>{button.icon}</span>}
                    {button.label}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.fontSize.sm,
                      color: tokens.color.textSubtle,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {button.action.type === 'insertText'
                      ? button.action.text
                      : button.action.type === 'startCapture'
                      ? 'Start recording'
                      : 'Open app'}
                  </div>
                  <div
                    style={{
                      marginTop: tokens.space.sm,
                      fontSize: tokens.fontSize.xs,
                      color: tokens.color.textSubtle,
                    }}
                  >
                    {button.showInStrip ? '✓ In floating deck' : 'Hidden from deck'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Panel */}
        {editingButton && (
          <div
            style={{
              width: 320,
              padding: tokens.space.lg,
              backgroundColor: tokens.color.surface,
              borderRadius: tokens.radius.md,
              height: 'fit-content',
            }}
          >
            <h3
              style={{
                fontSize: tokens.fontSize.lg,
                fontWeight: tokens.fontWeight.semibold,
                marginBottom: tokens.space.lg,
              }}
            >
              {isCreating ? 'New Button' : 'Edit Button'}
            </h3>

            {/* Label */}
            <div style={{ marginBottom: tokens.space.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.medium,
                  marginBottom: tokens.space.xs,
                }}
              >
                Label
              </label>
              <input
                type="text"
                value={editingButton.label}
                onChange={(e) => {
                  setFormError(null);
                  setEditingButton({ ...editingButton, label: e.target.value });
                }}
                placeholder="Button label"
                style={{
                  width: '100%',
                  padding: tokens.space.sm,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.md,
                }}
              />
            </div>

            {/* Text to insert */}
            <div style={{ marginBottom: tokens.space.lg }}>
              <label
                style={{
                  display: 'block',
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.medium,
                  marginBottom: tokens.space.xs,
                }}
              >
                Text to Insert
              </label>
              <textarea
                value={
                  editingButton.action.type === 'insertText'
                    ? editingButton.action.text
                    : ''
                }
                onChange={(e) => {
                  setFormError(null);
                  setEditingButton({
                    ...editingButton,
                    action: { type: 'insertText', text: e.target.value },
                  });
                }}
                placeholder="Text that will be inserted..."
                rows={4}
                style={{
                  width: '100%',
                  padding: tokens.space.sm,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.md,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Show in deck */}
            <div style={{ marginBottom: tokens.space.lg }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.space.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={editingButton.showInStrip}
                  onChange={(e) => {
                    setFormError(null);
                    setEditingButton({
                      ...editingButton,
                      showInStrip: e.target.checked,
                    });
                  }}
                />
                Show in floating deck
              </label>
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: tokens.space.lg,
                  padding: tokens.space.sm,
                  borderRadius: tokens.radius.sm,
                  backgroundColor: tokens.color.dangerSurface,
                  border: `1px solid ${tokens.color.danger}`,
                }}
              >
                <p style={{ color: tokens.color.danger, fontSize: tokens.fontSize.sm }}>
                  {formError}
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: tokens.space.sm }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: tokens.space.sm,
                  backgroundColor: tokens.color.brand,
                  color: 'white',
                  border: 'none',
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  fontWeight: tokens.fontWeight.semibold,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: tokens.space.sm,
                  backgroundColor: tokens.color.systemGray5,
                  color: tokens.color.text,
                  border: 'none',
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>

            {!isCreating && (
              <button
                onClick={() => handleDelete(editingButton.id)}
                style={{
                  width: '100%',
                  marginTop: tokens.space.md,
                  padding: tokens.space.sm,
                  backgroundColor:
                    pendingDeleteButtonId === editingButton.id
                      ? tokens.color.danger
                      : 'transparent',
                  color:
                    pendingDeleteButtonId === editingButton.id
                      ? 'white'
                      : tokens.color.danger,
                  border:
                    pendingDeleteButtonId === editingButton.id
                      ? 'none'
                      : `1px solid ${tokens.color.danger}`,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                {pendingDeleteButtonId === editingButton.id ? 'Confirm Delete' : 'Delete Button'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

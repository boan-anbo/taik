/**
 * Floating Deck Panel
 * A compact, always-on-top panel with quick-action buttons
 * Supports combined mode with embedded voice widget
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useDeckStore, useSettingsStore, useVoiceStore, DeckActionExecutor } from '@taik/domain';
import type { DeckButton, IDeckActionExecutor } from '@taik/domain';
import { TauriSystemAdapter } from '../adapters/TauriSystemAdapter';
import { TauriTextInputAdapter } from '../adapters/TauriTextInputAdapter';
import { VoiceWidget } from './VoiceWidget';

import './FloatingDeckPanel.css';

const systemAdapter = new TauriSystemAdapter();
const textInputAdapter = new TauriTextInputAdapter();

export function FloatingDeckPanel() {
  const { buttons, loadButtons } = useDeckStore();
  const { loadSettings } = useSettingsStore();
  const { settings: voiceSettings, loadSettings: loadVoiceSettings } = useVoiceStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Check if we should show voice widget in combined mode
  const showVoiceWidget = voiceSettings.displayMode === 'combined';

  // Create action executor with dependencies
  const actionExecutor: IDeckActionExecutor = useMemo(
    () =>
      new DeckActionExecutor({
        systemAdapter,
        textInputAdapter,
        onStartCapture: () => {
          // TODO: Connect to recording functionality
          console.log('Start capture triggered from deck');
        },
        onOpenApp: async (path) => {
          // TODO: Implement app opening via Tauri shell
          console.log('Open app triggered:', path);
        },
      }),
    []
  );

  // Initialize stores
  useEffect(() => {
    loadButtons();
    loadSettings();
    loadVoiceSettings();
  }, [loadButtons, loadSettings, loadVoiceSettings]);

  // Handle window drag
  const startDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    const window = getCurrentWindow();
    await window.startDragging();
    setIsDragging(false);
  }, []);

  // Handle button click - execute the button's action
  const handleButtonClick = useCallback(
    async (button: DeckButton) => {
      try {
        const result = await actionExecutor.executeAction(button.action);
        if (result.success) {
          setLastAction(result.message || `Action: ${button.label}`);
        } else {
          setLastAction(result.message || 'Action failed');
        }
        // Clear feedback after delay
        setTimeout(() => setLastAction(null), 1500);
      } catch (error) {
        console.error('Failed to execute action:', error);
        setLastAction('Action failed');
        setTimeout(() => setLastAction(null), 1500);
      }
    },
    [actionExecutor]
  );

  // Get display text for button tooltip
  const getButtonTooltip = (button: DeckButton): string => {
    if (button.action.type === 'insertText') {
      return button.action.text;
    }
    if (button.action.type === 'openApp') {
      return button.action.path || 'Open application';
    }
    return button.label;
  };

  // Toggle collapse state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Close the floating window
  const closePanel = useCallback(async () => {
    const window = getCurrentWindow();
    await window.hide();
  }, []);

  return (
    <div className={`floating-deck ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Drag handle / Header */}
      <div
        className="deck-header"
        onMouseDown={startDrag}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span className="deck-title">Taik</span>
        <div className="deck-controls">
          <button
            className="deck-control-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '+' : '-'}
          </button>
          <button
            className="deck-control-btn close"
            onClick={closePanel}
            title="Hide"
          >
            x
          </button>
        </div>
      </div>

      {/* Content (Voice Widget + Buttons grid) */}
      {!isCollapsed && (
        <div className="deck-content">
          {/* Voice Widget in combined mode */}
          {showVoiceWidget && (
            <div className="deck-voice-section">
              <VoiceWidget mode="minimal" />
            </div>
          )}

          {/* Buttons grid */}
          {buttons.length === 0 ? (
            <div className="deck-empty">
              No buttons configured.
              <br />
              Add buttons in the main app.
            </div>
          ) : (
            <div className="deck-buttons">
              {buttons.map((button) => (
                <button
                  key={button.id}
                  className="deck-btn"
                  onClick={() => handleButtonClick(button)}
                  title={getButtonTooltip(button)}
                >
                  {button.icon && <span className="btn-icon">{button.icon}</span>}
                  <span className="btn-label">{button.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action feedback */}
          {lastAction && (
            <div className="deck-feedback">{lastAction}</div>
          )}
        </div>
      )}
    </div>
  );
}

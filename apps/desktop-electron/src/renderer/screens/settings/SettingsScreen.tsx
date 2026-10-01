import { tokens } from '@taik/ui-tokens';
import { useSettingsStore } from '@taik/domain';
import { SpeechEngineSection } from './sections/SpeechEngineSection';
import { LanguageSection } from './sections/LanguageSection';
import { VoiceInputSection } from './sections/VoiceInputSection';
import { HotkeysSection } from './sections/HotkeysSection';
import { AboutSection } from './sections/AboutSection';

export function SettingsScreen() {
  const { error, clearError } = useSettingsStore();

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: tokens.color.dangerSurface,
            padding: tokens.space.md,
            borderRadius: tokens.radius.sm,
            marginBottom: tokens.space.lg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ color: tokens.color.danger, fontSize: tokens.fontSize.sm }}>
            {error}
          </p>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: tokens.color.danger,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ maxWidth: 600 }}>
        <SpeechEngineSection />
        <LanguageSection />
        <VoiceInputSection />
        <HotkeysSection />
        <AboutSection />
      </div>
    </div>
  );
}


import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '@taik/domain';
import { tokens } from '@taik/ui-tokens';

export function LanguageSection() {
  const { engineSettings, setLanguageHints } = useSettingsStore();

  const [languageInput, setLanguageInput] = useState(engineSettings.languageHints.join(', '));

  useEffect(() => {
    setLanguageInput(engineSettings.languageHints.join(', '));
  }, [engineSettings.languageHints]);

  const isLanguagesChanged = languageInput !== engineSettings.languageHints.join(', ');

  const handleSaveLanguages = useCallback(async () => {
    const languages = languageInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (languages.length > 0) {
      await setLanguageHints(languages);
    }
  }, [languageInput, setLanguageHints]);

  return (
    <section style={{ marginBottom: tokens.space.xxxl }}>
      <h2
        style={{
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          marginBottom: tokens.space.lg,
        }}
      >
        Language
      </h2>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.medium,
            marginBottom: tokens.space.xs,
          }}
        >
          Language Hints
        </label>
        <div style={{ display: 'flex', gap: tokens.space.sm }}>
          <input
            type="text"
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            placeholder="en, es, fr"
            style={{
              flex: 1,
              padding: tokens.space.sm,
              borderRadius: tokens.radius.sm,
              border: `1px solid ${tokens.color.borderSubtle}`,
              fontSize: tokens.fontSize.md,
            }}
          />
          <button
            onClick={() => void handleSaveLanguages()}
            disabled={!isLanguagesChanged}
            style={{
              padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
              backgroundColor: isLanguagesChanged ? tokens.color.brand : tokens.color.systemGray4,
              color: isLanguagesChanged ? 'white' : tokens.color.textSubtle,
              border: 'none',
              borderRadius: tokens.radius.sm,
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.semibold,
              cursor: isLanguagesChanged ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
        <p
          style={{
            fontSize: tokens.fontSize.xs,
            color: tokens.color.textSubtle,
            marginTop: tokens.space.xs,
          }}
        >
          Comma-separated language codes (e.g., en, es, zh)
        </p>
      </div>
    </section>
  );
}


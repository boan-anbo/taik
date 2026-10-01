import { useCallback, useMemo, useState } from 'react';
import {
  getActiveSonioxModel,
  getEngineDescription,
  getEngineDisplayName,
  getSonioxApiKey,
  SONIOX_DEFAULT_MODELS,
  useSettingsStore,
  type SonioxMode,
} from '@taik/domain';
import { tokens } from '@taik/ui-tokens';

export function SpeechEngineSection() {
  const {
    engineSettings,
    setSonioxApiKey,
    setSonioxMode,
    updateSonioxConfig,
  } = useSettingsStore();

  const currentApiKey = getSonioxApiKey(engineSettings);
  const currentMode = engineSettings.soniox?.mode ?? 'realtime';
  const currentCustomModel = engineSettings.soniox?.customModel ?? '';
  const currentFinalizeTimeoutMs = engineSettings.soniox?.finalizeTimeoutMs;
  const currentFinalizeMinWaitMs = engineSettings.soniox?.finalizeMinWaitMs;

  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey);
  const [customModelInput, setCustomModelInput] = useState(currentCustomModel);
  const [finalizeTimeoutSeconds, setFinalizeTimeoutSeconds] = useState(
    typeof currentFinalizeTimeoutMs === 'number' ? String(Math.round(currentFinalizeTimeoutMs / 100) / 10) : ''
  );
  const [finalizeMinWaitSeconds, setFinalizeMinWaitSeconds] = useState(
    typeof currentFinalizeMinWaitMs === 'number' ? String(Math.round(currentFinalizeMinWaitMs / 100) / 10) : ''
  );
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [isSavingCustomModel, setIsSavingCustomModel] = useState(false);
  const [isSavingFinalize, setIsSavingFinalize] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const isApiKeyChanged = apiKeyInput !== currentApiKey;
  const isCustomModelChanged = customModelInput !== currentCustomModel;
  const isFinalizeChanged =
    (finalizeTimeoutSeconds.trim() === '' ? undefined : finalizeTimeoutSeconds.trim()) !==
      (typeof currentFinalizeTimeoutMs === 'number'
        ? String(Math.round(currentFinalizeTimeoutMs / 100) / 10)
        : undefined) ||
    (finalizeMinWaitSeconds.trim() === '' ? undefined : finalizeMinWaitSeconds.trim()) !==
      (typeof currentFinalizeMinWaitMs === 'number'
        ? String(Math.round(currentFinalizeMinWaitMs / 100) / 10)
        : undefined);

  const activeModel = useMemo(() => {
    return engineSettings.soniox
      ? getActiveSonioxModel(engineSettings.soniox)
      : SONIOX_DEFAULT_MODELS.realtime;
  }, [engineSettings.soniox]);

  const handleSaveApiKey = useCallback(async () => {
    setIsSavingApiKey(true);
    try {
      await setSonioxApiKey(apiKeyInput);
    } finally {
      setIsSavingApiKey(false);
    }
  }, [apiKeyInput, setSonioxApiKey]);

  const handleModeChange = useCallback(async (mode: SonioxMode) => {
    await setSonioxMode(mode);
  }, [setSonioxMode]);

  const handleSaveCustomModel = useCallback(async () => {
    setIsSavingCustomModel(true);
    try {
      await updateSonioxConfig({ customModel: customModelInput.trim() || undefined });
    } finally {
      setIsSavingCustomModel(false);
    }
  }, [customModelInput, updateSonioxConfig]);

  const handleSaveFinalize = useCallback(async () => {
    const parseSeconds = (v: string): number | undefined => {
      const t = v.trim();
      if (!t) return undefined;
      const n = Number(t);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return Math.round(n * 1000);
    };

    setIsSavingFinalize(true);
    try {
      await updateSonioxConfig({
        finalizeTimeoutMs: parseSeconds(finalizeTimeoutSeconds),
        finalizeMinWaitMs: parseSeconds(finalizeMinWaitSeconds),
      });
    } finally {
      setIsSavingFinalize(false);
    }
  }, [finalizeMinWaitSeconds, finalizeTimeoutSeconds, updateSonioxConfig]);

  return (
    <section style={{ marginBottom: tokens.space.xxxl }}>
      <h2
        style={{
          fontSize: tokens.fontSize.lg,
          fontWeight: tokens.fontWeight.semibold,
          marginBottom: tokens.space.lg,
        }}
      >
        Speech Engine
      </h2>

      <div
        style={{
          backgroundColor: tokens.color.surface,
          borderRadius: tokens.radius.md,
          padding: tokens.space.lg,
        }}
      >
        <div style={{ marginBottom: tokens.space.lg }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.space.sm,
              marginBottom: tokens.space.xs,
            }}
          >
            <span style={{ fontSize: 20 }}>🌐</span>
            <span style={{ fontWeight: tokens.fontWeight.semibold }}>
              {getEngineDisplayName('soniox')}
            </span>
            <span
              style={{
                backgroundColor: tokens.color.success,
                color: 'white',
                fontSize: tokens.fontSize.xs,
                padding: '2px 8px',
                borderRadius: tokens.radius.pill,
              }}
            >
              Active
            </span>
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.sm,
              color: tokens.color.textSubtle,
            }}
          >
            {getEngineDescription('soniox')}
          </p>
        </div>

        {/* API Key */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Soniox API Key
          </label>
          <div style={{ display: 'flex', gap: tokens.space.sm }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your Soniox API key"
                style={{
                  width: '100%',
                  padding: tokens.space.sm,
                  paddingRight: 40,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.md,
                }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              disabled={!isApiKeyChanged || isSavingApiKey}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                backgroundColor: isApiKeyChanged ? tokens.color.brand : tokens.color.systemGray4,
                color: isApiKeyChanged ? 'white' : tokens.color.textSubtle,
                border: 'none',
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                cursor: isApiKeyChanged ? 'pointer' : 'not-allowed',
              }}
            >
              {isSavingApiKey ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Get your API key from{' '}
            <a
              href="https://soniox.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: tokens.color.brand }}
            >
              soniox.com
            </a>
          </p>
        </div>

        {/* Transcription Mode */}
        <div style={{ marginTop: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Transcription Mode
          </label>
          <div style={{ display: 'flex', gap: tokens.space.sm }}>
            <button
              onClick={() => void handleModeChange('realtime')}
              style={{
                flex: 1,
                padding: tokens.space.sm,
                backgroundColor: currentMode === 'realtime' ? tokens.color.brand : tokens.color.surface,
                color: currentMode === 'realtime' ? 'white' : tokens.color.text,
                border: `1px solid ${currentMode === 'realtime' ? tokens.color.brand : tokens.color.borderSubtle}`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Real-time
            </button>
            <button
              onClick={() => void handleModeChange('async')}
              style={{
                flex: 1,
                padding: tokens.space.sm,
                backgroundColor: currentMode === 'async' ? tokens.color.brand : tokens.color.surface,
                color: currentMode === 'async' ? 'white' : tokens.color.text,
                border: `1px solid ${currentMode === 'async' ? tokens.color.brand : tokens.color.borderSubtle}`,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                cursor: 'pointer',
              }}
            >
              Async (File Upload)
            </button>
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Real-time: Live microphone transcription. Async: Upload audio files.
          </p>
        </div>

        {/* Model Override */}
        <div style={{ marginTop: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Model Override (Optional)
          </label>
          <div style={{ display: 'flex', gap: tokens.space.sm }}>
            <input
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder={`Default: ${SONIOX_DEFAULT_MODELS[currentMode]}`}
              style={{
                flex: 1,
                padding: tokens.space.sm,
                borderRadius: tokens.radius.sm,
                border: `1px solid ${tokens.color.borderSubtle}`,
                fontSize: tokens.fontSize.sm,
              }}
            />
            <button
              onClick={handleSaveCustomModel}
              disabled={!isCustomModelChanged || isSavingCustomModel}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                backgroundColor: isCustomModelChanged ? tokens.color.brand : tokens.color.systemGray4,
                color: isCustomModelChanged ? 'white' : tokens.color.textSubtle,
                border: 'none',
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                cursor: isCustomModelChanged ? 'pointer' : 'not-allowed',
              }}
            >
              {isSavingCustomModel ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            Active model: <strong>{activeModel}</strong>
          </p>
        </div>

        {/* Realtime Stop Finalization */}
        <div style={{ marginTop: tokens.space.lg }}>
          <label
            style={{
              display: 'block',
              fontSize: tokens.fontSize.sm,
              fontWeight: tokens.fontWeight.medium,
              marginBottom: tokens.space.xs,
            }}
          >
            Realtime stop finalization (advanced)
          </label>
          <div style={{ display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
              <span style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
                Max wait (seconds)
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={finalizeTimeoutSeconds}
                onChange={(e) => setFinalizeTimeoutSeconds(e.target.value)}
                placeholder="auto"
                style={{
                  width: '100%',
                  padding: tokens.space.sm,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.sm,
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
              <span style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
                Min wait (seconds)
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={finalizeMinWaitSeconds}
                onChange={(e) => setFinalizeMinWaitSeconds(e.target.value)}
                placeholder="auto"
                style={{
                  width: '100%',
                  padding: tokens.space.sm,
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${tokens.color.borderSubtle}`,
                  fontSize: tokens.fontSize.sm,
                }}
              />
            </label>
            <button
              onClick={handleSaveFinalize}
              disabled={!isFinalizeChanged || isSavingFinalize}
              style={{
                padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
                backgroundColor: isFinalizeChanged ? tokens.color.brand : tokens.color.systemGray4,
                color: isFinalizeChanged ? 'white' : tokens.color.textSubtle,
                border: 'none',
                borderRadius: tokens.radius.sm,
                fontSize: tokens.fontSize.sm,
                fontWeight: tokens.fontWeight.semibold,
                cursor: isFinalizeChanged ? 'pointer' : 'not-allowed',
                alignSelf: 'flex-end',
              }}
            >
              {isSavingFinalize ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p
            style={{
              fontSize: tokens.fontSize.xs,
              color: tokens.color.textSubtle,
              marginTop: tokens.space.xs,
            }}
          >
            When you stop recording mid-utterance, Taik waits for Soniox to finalize the last sentence. Leave “auto” unless you want to fine tune.
          </p>
        </div>
      </div>
    </section>
  );
}

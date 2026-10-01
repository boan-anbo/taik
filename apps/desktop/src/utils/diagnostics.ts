import type { SpeechEngineSettings } from '@taik/domain';
import type { VoiceSettings, VoiceWindowPositions } from '@taik/domain';
import type { TranscriptEntry } from '@taik/domain';

export interface DiagnosticsSnapshot {
  createdAt: string;
  app: {
    name?: string;
    version?: string;
    mode: string;
  };
  environment: {
    userAgent: string;
    platform: string;
    language: string;
  };
  settings: {
    engine: SpeechEngineSettings;
    voice: {
      settings: VoiceSettings;
      windowPositions: VoiceWindowPositions;
    };
  };
  logs: {
    count: number;
    entries: Array<{
      timestamp: number;
      windowLabel: string;
      level: string;
      message: string;
    }>;
  };
}

export interface TranscriptSummary {
  id: string;
  createdAt: string;
  source: string;
  duration: number;
  text?: string;
  textPreview: string;
  metadata?: {
    engine?: string;
    language?: string;
    fileName?: string;
    audioFileName?: string;
  };
}

export interface BugReportBundle {
  createdAt: string;
  diagnostics: DiagnosticsSnapshot;
  uiFilters?: Record<string, unknown>;
  transcripts: {
    count: number;
    newestCreatedAt?: string;
    oldestCreatedAt?: string;
    sample: TranscriptSummary[];
  };
}

export function redactEngineSettings(settings: SpeechEngineSettings): SpeechEngineSettings {
  const redacted: SpeechEngineSettings = { ...settings };

  if ('sonioxApiKey' in redacted) {
    redacted.sonioxApiKey = redacted.sonioxApiKey ? '<redacted>' : redacted.sonioxApiKey;
  }

  if (redacted.soniox) {
    redacted.soniox = {
      ...redacted.soniox,
      apiKey: redacted.soniox.apiKey ? '<redacted>' : redacted.soniox.apiKey,
    };
  }

  return redacted;
}

function toTextPreview(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

export function summarizeTranscripts(
  entries: TranscriptEntry[],
  options?: { maxEntries?: number; includeText?: boolean; previewChars?: number }
): TranscriptSummary[] {
  const maxEntries = options?.maxEntries ?? 12;
  const includeText = options?.includeText ?? false;
  const previewChars = options?.previewChars ?? 240;

  return entries.slice(0, maxEntries).map((e) => {
    const audioUri = e.metadata?.audioUri;
    const audioFileName = audioUri ? audioUri.split('/').pop() : undefined;

    return {
      id: e.id,
      createdAt: e.createdAt,
      source: e.source,
      duration: e.duration,
      ...(includeText ? { text: e.text } : {}),
      textPreview: toTextPreview(e.text, previewChars),
      metadata: e.metadata
        ? {
            engine: e.metadata.engine,
            language: e.metadata.language,
            fileName: e.metadata.fileName,
            audioFileName,
          }
        : undefined,
    };
  });
}

export async function buildDiagnosticsSnapshot(input: {
  appName?: string;
  appVersion?: string;
  engineSettings: SpeechEngineSettings;
  voiceSettings: VoiceSettings;
  voiceWindowPositions: VoiceWindowPositions;
  logs: Array<{
    timestamp: number;
    windowLabel: string;
    level: string;
    message: string;
  }>;
}): Promise<DiagnosticsSnapshot> {
  return {
    createdAt: new Date().toISOString(),
    app: {
      name: input.appName,
      version: input.appVersion,
      mode: import.meta.env.MODE,
    },
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
    settings: {
      engine: redactEngineSettings(input.engineSettings),
      voice: {
        settings: input.voiceSettings,
        windowPositions: input.voiceWindowPositions,
      },
    },
    logs: {
      count: input.logs.length,
      entries: input.logs,
    },
  };
}

export async function buildBugReportBundle(input: {
  diagnostics: DiagnosticsSnapshot;
  transcripts: TranscriptEntry[];
  uiFilters?: Record<string, unknown>;
  includeTranscriptText?: boolean;
}): Promise<BugReportBundle> {
  const newestCreatedAt = input.transcripts[0]?.createdAt;
  const oldestCreatedAt =
    input.transcripts.length > 0
      ? input.transcripts[input.transcripts.length - 1].createdAt
      : undefined;

  return {
    createdAt: new Date().toISOString(),
    diagnostics: input.diagnostics,
    uiFilters: input.uiFilters,
    transcripts: {
      count: input.transcripts.length,
      newestCreatedAt,
      oldestCreatedAt,
      sample: summarizeTranscripts(input.transcripts, {
        includeText: input.includeTranscriptText ?? false,
      }),
    },
  };
}

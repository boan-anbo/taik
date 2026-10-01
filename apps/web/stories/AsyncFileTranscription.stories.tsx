import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { tokens } from '@taik/ui-tokens';

/**
 * Mock progress type matching AsyncTranscriptionProgress from @taik/speech-engine
 */
interface MockProgress {
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  transcriptionId?: string;
  errorMessage?: string;
}

/**
 * Supported audio file formats with their MIME types
 * This demonstrates the formats supported by the async transcription API
 */
const SUPPORTED_FORMATS = [
  { extension: 'm4a', mimeType: 'audio/mp4', description: 'Apple Voice Memo / AAC' },
  { extension: 'mp3', mimeType: 'audio/mpeg', description: 'MP3 Audio' },
  { extension: 'wav', mimeType: 'audio/wav', description: 'WAV Audio' },
  { extension: 'flac', mimeType: 'audio/flac', description: 'FLAC Lossless' },
  { extension: 'ogg', mimeType: 'audio/ogg', description: 'OGG Vorbis' },
  { extension: 'webm', mimeType: 'audio/webm', description: 'WebM Audio' },
  { extension: 'aac', mimeType: 'audio/aac', description: 'AAC Audio' },
  { extension: 'mp4', mimeType: 'video/mp4', description: 'MP4 Video (audio track)' },
];

interface FileUploadProgressProps {
  progress: MockProgress;
  fileName: string;
  onCancel?: () => void;
}

/**
 * FileUploadProgress displays transcription progress during async file processing
 */
function FileUploadProgress({ progress, fileName, onCancel }: FileUploadProgressProps) {
  const getStatusText = (): string => {
    switch (progress.status) {
      case 'queued':
        return `Uploading: ${progress.progress}%`;
      case 'processing':
        return `Transcribing: ${progress.progress}%`;
      case 'completed':
        return 'Completed!';
      case 'error':
        return progress.errorMessage || 'Error occurred';
      default:
        return 'Unknown status';
    }
  };

  const getProgressColor = (): string => {
    switch (progress.status) {
      case 'completed':
        return tokens.color.success || '#22c55e';
      case 'error':
        return tokens.color.danger;
      default:
        return tokens.color.brand;
    }
  };

  return (
    <div
      style={{
        backgroundColor: tokens.color.surface,
        padding: tokens.space.md,
        borderRadius: tokens.radius.md,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space.md,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: tokens.fontSize.sm,
            fontWeight: tokens.fontWeight.medium,
            marginBottom: tokens.space.xs,
          }}
        >
          {fileName}
        </div>
        <div
          style={{
            fontSize: tokens.fontSize.xs,
            color: progress.status === 'error' ? tokens.color.danger : tokens.color.textSubtle,
            marginBottom: tokens.space.sm,
          }}
        >
          {getStatusText()}
        </div>
        <div
          style={{
            height: 4,
            backgroundColor: tokens.color.borderSubtle,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: getProgressColor(),
              width: `${progress.progress}%`,
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
      </div>
      {progress.status !== 'completed' && progress.status !== 'error' && onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
            backgroundColor: 'transparent',
            color: tokens.color.textSubtle,
            border: `1px solid ${tokens.color.borderSubtle}`,
            borderRadius: tokens.radius.sm,
            fontSize: tokens.fontSize.xs,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

/**
 * FileUploadProgress shows the progress of async file transcription
 */
const meta: Meta<typeof FileUploadProgress> = {
  title: 'Components/AsyncFileTranscription',
  component: FileUploadProgress,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          backgroundColor: tokens.color.background,
          padding: tokens.space.xl,
          borderRadius: tokens.radius.md,
          minWidth: 400,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ========== Progress States ==========

export const Queued: Story = {
  args: {
    progress: { status: 'queued', progress: 0 },
    fileName: 'voice_memo.m4a',
  },
};

export const Uploading: Story = {
  args: {
    progress: { status: 'queued', progress: 35 },
    fileName: 'recording.mp3',
  },
};

export const Processing: Story = {
  args: {
    progress: { status: 'processing', progress: 65 },
    fileName: 'interview.wav',
  },
};

export const Completed: Story = {
  args: {
    progress: { status: 'completed', progress: 100 },
    fileName: 'meeting_notes.m4a',
  },
};

export const Error: Story = {
  args: {
    progress: {
      status: 'error',
      progress: 45,
      errorMessage: 'Failed to process file: unsupported format',
    },
    fileName: 'corrupted_audio.xyz',
  },
};

// ========== Animated Progress Simulation ==========

function AnimatedProgressDemo() {
  const [progress, setProgress] = useState<MockProgress>({
    status: 'queued',
    progress: 0,
  });
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev.progress >= 100) {
          return { status: 'completed', progress: 100 };
        }
        const newProgress = Math.min(prev.progress + Math.random() * 15, 100);
        const newStatus =
          newProgress < 20 ? 'queued' : newProgress < 100 ? 'processing' : 'completed';
        return { status: newStatus, progress: Math.floor(newProgress) };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleRestart = () => {
    setProgress({ status: 'queued', progress: 0 });
    setIsRunning(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.md }}>
      <FileUploadProgress
        progress={progress}
        fileName="apple_voice_memo.m4a"
        onCancel={() => setIsRunning(false)}
      />
      {progress.status === 'completed' && (
        <button
          onClick={handleRestart}
          style={{
            padding: `${tokens.space.sm}px ${tokens.space.lg}px`,
            backgroundColor: tokens.color.brand,
            color: 'white',
            border: 'none',
            borderRadius: tokens.radius.md,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Restart Demo
        </button>
      )}
    </div>
  );
}

export const AnimatedProgress: Story = {
  render: () => <AnimatedProgressDemo />,
};

// ========== Supported Formats Demo ==========

function SupportedFormatsDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.lg }}>
      <h3 style={{ margin: 0, color: tokens.color.text }}>Supported Audio Formats</h3>
      <p style={{ margin: 0, color: tokens.color.textSubtle, fontSize: tokens.fontSize.sm }}>
        The async transcription API supports these audio formats with proper MIME type detection:
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: tokens.space.md,
        }}
      >
        {SUPPORTED_FORMATS.map(({ extension, mimeType, description }) => (
          <div
            key={extension}
            style={{
              backgroundColor: tokens.color.surface,
              padding: tokens.space.md,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.borderSubtle}`,
            }}
          >
            <div style={{ fontWeight: tokens.fontWeight.semibold, marginBottom: 4 }}>
              .{extension}
            </div>
            <div style={{ fontSize: tokens.fontSize.xs, color: tokens.color.textSubtle }}>
              {description}
            </div>
            <div
              style={{
                fontSize: tokens.fontSize.xs,
                color: tokens.color.brand,
                fontFamily: 'monospace',
                marginTop: 4,
              }}
            >
              {mimeType}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SupportedFormats: Story = {
  name: 'Supported Audio Formats',
  render: () => <SupportedFormatsDemo />,
};

// ========== All States Overview ==========

export const AllStates: Story = {
  name: 'All Progress States',
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.lg }}>
      <div>
        <h4 style={{ margin: `0 0 ${tokens.space.sm}px`, color: tokens.color.textSubtle }}>
          Queued (Uploading)
        </h4>
        <FileUploadProgress
          progress={{ status: 'queued', progress: 15 }}
          fileName="voice_memo.m4a"
        />
      </div>
      <div>
        <h4 style={{ margin: `0 0 ${tokens.space.sm}px`, color: tokens.color.textSubtle }}>
          Processing (Transcribing)
        </h4>
        <FileUploadProgress
          progress={{ status: 'processing', progress: 60 }}
          fileName="interview.mp3"
        />
      </div>
      <div>
        <h4 style={{ margin: `0 0 ${tokens.space.sm}px`, color: tokens.color.textSubtle }}>
          Completed
        </h4>
        <FileUploadProgress
          progress={{ status: 'completed', progress: 100 }}
          fileName="meeting_recording.wav"
        />
      </div>
      <div>
        <h4 style={{ margin: `0 0 ${tokens.space.sm}px`, color: tokens.color.textSubtle }}>
          Error
        </h4>
        <FileUploadProgress
          progress={{
            status: 'error',
            progress: 30,
            errorMessage: 'Invalid API key. Please check your settings.',
          }}
          fileName="failed_upload.m4a"
        />
      </div>
    </div>
  ),
};

// ========== M4A Specific Demo ==========

function M4ADemo() {
  const [progress, setProgress] = useState<MockProgress>({ status: 'queued', progress: 0 });
  const [stage, setStage] = useState<'idle' | 'running' | 'done'>('idle');

  const startDemo = () => {
    setStage('running');
    setProgress({ status: 'queued', progress: 0 });

    // Simulate upload and processing
    const steps = [
      { status: 'queued' as const, progress: 10, delay: 500 },
      { status: 'queued' as const, progress: 25, delay: 800 },
      { status: 'queued' as const, progress: 45, delay: 600 },
      { status: 'processing' as const, progress: 55, delay: 700 },
      { status: 'processing' as const, progress: 70, delay: 900 },
      { status: 'processing' as const, progress: 85, delay: 600 },
      { status: 'processing' as const, progress: 95, delay: 500 },
      { status: 'completed' as const, progress: 100, delay: 400 },
    ];

    let totalDelay = 0;
    steps.forEach(({ status, progress, delay }) => {
      totalDelay += delay;
      setTimeout(() => {
        setProgress({ status, progress });
        if (status === 'completed') {
          setStage('done');
        }
      }, totalDelay);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.lg }}>
      <div>
        <h3 style={{ margin: 0, color: tokens.color.text }}>M4A File Processing Demo</h3>
        <p style={{ color: tokens.color.textSubtle, fontSize: tokens.fontSize.sm }}>
          Demonstrates processing an Apple Voice Memo (.m4a) file with proper MIME type detection
          (audio/mp4).
        </p>
      </div>

      {stage !== 'idle' && (
        <FileUploadProgress
          progress={progress}
          fileName="Apple_Voice_Memo_Recording.m4a"
          onCancel={() => setStage('idle')}
        />
      )}

      {stage === 'idle' && (
        <button
          onClick={startDemo}
          style={{
            padding: `${tokens.space.md}px ${tokens.space.xl}px`,
            backgroundColor: tokens.color.brand,
            color: 'white',
            border: 'none',
            borderRadius: tokens.radius.md,
            fontSize: tokens.fontSize.md,
            fontWeight: tokens.fontWeight.semibold,
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          Start M4A Processing Demo
        </button>
      )}

      {stage === 'done' && (
        <div
          style={{
            padding: tokens.space.md,
            backgroundColor: `${tokens.color.success || '#22c55e'}15`,
            borderRadius: tokens.radius.md,
            color: tokens.color.success || '#22c55e',
            fontSize: tokens.fontSize.sm,
          }}
        >
          M4A file processed successfully with MIME type: audio/mp4
          <button
            onClick={() => setStage('idle')}
            style={{
              marginLeft: tokens.space.md,
              padding: `${tokens.space.xs}px ${tokens.space.sm}px`,
              backgroundColor: 'transparent',
              border: `1px solid currentColor`,
              borderRadius: tokens.radius.sm,
              color: 'inherit',
              cursor: 'pointer',
              fontSize: tokens.fontSize.xs,
            }}
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}

export const M4AProcessingDemo: Story = {
  name: 'M4A Processing Demo',
  render: () => <M4ADemo />,
};

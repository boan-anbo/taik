/**
 * Domain Hooks
 * Re-export all hooks
 */

export {
  useRecording,
  type UseRecordingReturn,
  type UseRecordingOptions,
  type RecordingState,
} from './useRecording';

export {
  useVoiceRecording,
  type UseVoiceRecordingOptions,
  type UseVoiceRecordingReturn,
  type IVoiceTextInputAdapter,
  type IVoiceSystemAdapter,
} from './useVoiceRecording';

export {
  useRealtimeTranscription,
  type UseRealtimeTranscriptionOptions,
  type UseRealtimeTranscriptionReturn,
  type RealtimeTranscriptionState,
} from './useRealtimeTranscription';

export {
  useAsyncTranscription,
  type UseAsyncTranscriptionOptions,
  type UseAsyncTranscriptionReturn,
  type AsyncTranscriptionState,
} from './useAsyncTranscription';

export {
  useAudioVisualization,
  type UseAudioVisualizationOptions,
  type UseAudioVisualizationReturn,
  type AudioVisualizationData,
} from './useAudioVisualization';

export {
  useRecordingSession,
  type UseRecordingSessionOptions,
  type UseRecordingSessionReturn,
  type SessionState,
  type ITextInputAdapter,
  type ISystemAdapter,
} from './useRecordingSession';

export {
  useAudioStreamManager,
  type UseAudioStreamManagerOptions,
  type UseAudioStreamManagerReturn,
  type StreamState,
} from './useAudioStreamManager';

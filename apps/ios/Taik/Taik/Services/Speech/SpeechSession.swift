import Foundation
import AVFoundation

/// Represents the current state of a speech recognition session
enum SpeechSessionState: Equatable {
    case idle           // Session created but not started
    case listening      // Actively receiving audio
    case processing     // Finalizing results after audio stopped
    case completed      // Final result delivered
    case failed(String) // Error occurred
    case cancelled      // User cancelled

    var isTerminal: Bool {
        switch self {
        case .completed, .failed, .cancelled:
            return true
        default:
            return false
        }
    }
}

/// A speech recognition result (partial or final)
struct SpeechResult {
    /// The transcribed text
    let text: String

    /// Whether this is the final result
    let isFinal: Bool

    /// Confidence score (0.0-1.0) if available
    let confidence: Float?

    /// Alternative transcriptions if available
    let alternatives: [String]

    /// Timing information if available
    let segments: [SpeechSegment]

    init(
        text: String,
        isFinal: Bool = false,
        confidence: Float? = nil,
        alternatives: [String] = [],
        segments: [SpeechSegment] = []
    ) {
        self.text = text
        self.isFinal = isFinal
        self.confidence = confidence
        self.alternatives = alternatives
        self.segments = segments
    }
}

/// A timed segment of transcribed speech
struct SpeechSegment {
    let text: String
    let startTime: TimeInterval
    let endTime: TimeInterval
    let confidence: Float?
}

/// Protocol for an active speech recognition session
/// Sessions receive audio buffers and emit transcription results via callbacks
protocol SpeechSession: AnyObject {
    /// Current state of the session
    var state: SpeechSessionState { get }

    /// The engine that created this session
    var engineId: SpeechEngineId { get }

    /// Options this session was configured with
    var options: SpeechRecognitionOptions { get }

    // MARK: - Callbacks

    /// Called when a partial result is available
    var onPartialResult: ((SpeechResult) -> Void)? { get set }

    /// Called when the final result is available
    var onFinalResult: ((SpeechResult) -> Void)? { get set }

    /// Called when an error occurs
    var onError: ((SpeechEngineError) -> Void)? { get set }

    /// Called when session state changes
    var onStateChange: ((SpeechSessionState) -> Void)? { get set }

    // MARK: - Audio Input

    /// Feed an audio buffer to the recognizer
    /// - Parameter buffer: PCM audio buffer to process
    func feedAudio(_ buffer: AVAudioPCMBuffer)

    /// Start listening (for sessions that manage their own audio)
    func startListening() throws

    /// Stop receiving audio and finalize results
    func stop()

    /// Cancel the session without finalizing
    func cancel()
}

/// Default implementations
extension SpeechSession {
    /// Convenience method to check if session is still active
    var isActive: Bool {
        switch state {
        case .idle, .listening, .processing:
            return true
        case .completed, .failed, .cancelled:
            return false
        }
    }
}

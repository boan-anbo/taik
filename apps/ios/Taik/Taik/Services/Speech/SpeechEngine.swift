import Foundation

/// Identifies the speech engine implementation
/// Each engine represents a distinct STT backend with its own capabilities
enum SpeechEngineId: String, Codable, CaseIterable, Identifiable {
    case appleOnline        // SFSpeechRecognizer, server-side processing
    case appleOnDevice      // SFSpeechRecognizer, requiresOnDeviceRecognition = true
    case appleSpeechAnalyzerMac  // Future: macOS 26+ Speech Analyzer
    case whisperLocal       // Future: WhisperKit on-device
    case remoteApi          // Future: DeepGram, Soniox, OpenAI Whisper API, etc.

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .appleOnline:
            return "Apple Online"
        case .appleOnDevice:
            return "Apple On-Device"
        case .appleSpeechAnalyzerMac:
            return "Apple Speech Analyzer (macOS)"
        case .whisperLocal:
            return "Whisper (Local)"
        case .remoteApi:
            return "Remote API"
        }
    }

    var description: String {
        switch self {
        case .appleOnline:
            return "Apple's server-side speech recognition. Requires internet."
        case .appleOnDevice:
            return "Apple's on-device speech recognition. Works offline."
        case .appleSpeechAnalyzerMac:
            return "macOS 26+ advanced speech recognition."
        case .whisperLocal:
            return "OpenAI Whisper running locally via WhisperKit."
        case .remoteApi:
            return "Cloud-based speech recognition APIs."
        }
    }

    /// Whether this engine is available on the current platform/device
    var isAvailableOnPlatform: Bool {
        switch self {
        case .appleOnline, .appleOnDevice:
            return true  // Available on all iOS versions we support
        case .appleSpeechAnalyzerMac:
            #if os(macOS)
            if #available(macOS 26, *) {
                return true
            }
            #endif
            return false
        case .whisperLocal:
            return false  // Stub - will require WhisperKit integration
        case .remoteApi:
            return false  // Stub - will require API configuration
        }
    }
}

/// Error types for speech recognition
enum SpeechEngineError: LocalizedError {
    case engineNotAvailable(SpeechEngineId)
    case authorizationDenied
    case authorizationRestricted
    case recognizerNotAvailable
    case localeNotSupported(Locale)
    case onDeviceNotSupported(Locale)
    case sessionAlreadyActive
    case noActiveSession
    case audioEngineError(Error)
    case recognitionFailed(Error)
    case networkUnavailable
    case timeout
    case cancelled

    var errorDescription: String? {
        switch self {
        case .engineNotAvailable(let id):
            return "Speech engine '\(id.displayName)' is not available."
        case .authorizationDenied:
            return "Speech recognition permission was denied."
        case .authorizationRestricted:
            return "Speech recognition is restricted on this device."
        case .recognizerNotAvailable:
            return "Speech recognizer is not available."
        case .localeNotSupported(let locale):
            return "Locale '\(locale.identifier)' is not supported."
        case .onDeviceNotSupported(let locale):
            return "On-device recognition not available for '\(locale.identifier)'."
        case .sessionAlreadyActive:
            return "A recognition session is already active."
        case .noActiveSession:
            return "No active recognition session."
        case .audioEngineError(let error):
            return "Audio engine error: \(error.localizedDescription)"
        case .recognitionFailed(let error):
            return "Recognition failed: \(error.localizedDescription)"
        case .networkUnavailable:
            return "Network is unavailable for online recognition."
        case .timeout:
            return "Recognition timed out."
        case .cancelled:
            return "Recognition was cancelled."
        }
    }
}

/// Protocol for speech recognition engines
/// Implementations wrap different STT backends (Apple Speech, Whisper, APIs, etc.)
protocol SpeechEngine: AnyObject {
    /// Unique identifier for this engine type
    var id: SpeechEngineId { get }

    /// Human-readable display name
    var displayName: String { get }

    /// Capabilities of this engine
    var capabilities: SpeechEngineCapabilities { get }

    /// Check if the engine is currently available (permissions, network, etc.)
    func checkAvailability() async -> Result<Void, SpeechEngineError>

    /// Request authorization for speech recognition
    func requestAuthorization() async -> Result<Void, SpeechEngineError>

    /// Start a new recognition session
    /// - Parameter options: Configuration for this session
    /// - Returns: A SpeechSession that can be used to feed audio and receive results
    func startSession(options: SpeechRecognitionOptions) async throws -> SpeechSession
}

/// Default implementation for display name
extension SpeechEngine {
    var displayName: String {
        id.displayName
    }
}

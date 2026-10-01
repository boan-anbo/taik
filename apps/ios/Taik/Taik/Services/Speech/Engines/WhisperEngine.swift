import Foundation
import AVFoundation

/// Speech engine using WhisperKit for local on-device transcription
/// NOTE: This is a stub implementation - WhisperKit integration will be added later
final class WhisperEngine: SpeechEngine {
    let id: SpeechEngineId = .whisperLocal

    /// Model download status
    enum ModelStatus {
        case notDownloaded
        case downloading(progress: Double)
        case ready
        case error(String)
    }

    private var modelStatus: ModelStatus = .notDownloaded
    private var modelPath: String?

    var capabilities: SpeechEngineCapabilities {
        .whisperLocal
    }

    func checkAvailability() async -> Result<Void, SpeechEngineError> {
        // Check if model is downloaded
        switch modelStatus {
        case .ready:
            return .success(())
        case .notDownloaded:
            return .failure(.engineNotAvailable(.whisperLocal))
        case .downloading:
            return .failure(.engineNotAvailable(.whisperLocal))
        case .error(let message):
            return .failure(.recognitionFailed(NSError(domain: "WhisperEngine", code: -1, userInfo: [NSLocalizedDescriptionKey: message])))
        }
    }

    func requestAuthorization() async -> Result<Void, SpeechEngineError> {
        // Whisper doesn't require special authorization, just model download
        return .success(())
    }

    func startSession(options: SpeechRecognitionOptions) async throws -> SpeechSession {
        let availability = await checkAvailability()
        if case .failure(let error) = availability {
            throw error
        }

        // TODO: Implement actual WhisperKit session
        // For now, throw not available
        throw SpeechEngineError.engineNotAvailable(.whisperLocal)
    }

    // MARK: - Model Management

    /// Download the Whisper model
    func downloadModel(modelName: String = "base") async throws {
        modelStatus = .downloading(progress: 0)

        // TODO: Implement actual model download using WhisperKit
        // Example:
        // let whisperKit = try await WhisperKit(modelFolder: documentsFolder, model: modelName)
        // modelPath = whisperKit.modelFolder

        throw SpeechEngineError.engineNotAvailable(.whisperLocal)
    }

    /// Delete the downloaded model
    func deleteModel() {
        if let path = modelPath {
            try? FileManager.default.removeItem(atPath: path)
        }
        modelPath = nil
        modelStatus = .notDownloaded
    }

    /// Get model size for a given model name
    static func modelSize(for name: String) -> Int64 {
        // Approximate sizes in bytes
        switch name {
        case "tiny": return 39_000_000
        case "base": return 147_000_000
        case "small": return 488_000_000
        case "medium": return 1_500_000_000
        case "large": return 3_100_000_000
        default: return 147_000_000
        }
    }
}

/// Whisper speech session (stub)
final class WhisperSession: SpeechSession {
    let engineId: SpeechEngineId = .whisperLocal
    let options: SpeechRecognitionOptions

    private(set) var state: SpeechSessionState = .idle

    var onPartialResult: ((SpeechResult) -> Void)?
    var onFinalResult: ((SpeechResult) -> Void)?
    var onError: ((SpeechEngineError) -> Void)?
    var onStateChange: ((SpeechSessionState) -> Void)?

    private var audioBuffers: [AVAudioPCMBuffer] = []

    init(options: SpeechRecognitionOptions) {
        self.options = options
    }

    func feedAudio(_ buffer: AVAudioPCMBuffer) {
        // Whisper processes audio at the end, so collect buffers
        audioBuffers.append(buffer)
    }

    func startListening() throws {
        state = .listening
        onStateChange?(state)
    }

    func stop() {
        state = .processing
        onStateChange?(state)

        // TODO: Process collected audio with WhisperKit
        // For now, just complete with empty result
        let result = SpeechResult(text: "", isFinal: true)
        state = .completed
        onStateChange?(state)
        onFinalResult?(result)
    }

    func cancel() {
        audioBuffers.removeAll()
        state = .cancelled
        onStateChange?(state)
    }
}

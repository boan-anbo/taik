import Foundation

/// Describes the capabilities of a speech recognition engine
struct SpeechEngineCapabilities {
    /// Whether the engine supports streaming audio (real-time partial results)
    let supportsStreaming: Bool

    /// Whether the engine can run entirely on-device (no network required)
    let supportsOnDevice: Bool

    /// Whether the engine adds punctuation automatically
    let supportsPunctuation: Bool

    /// Whether the engine can identify different speakers
    let supportsSpeakerDiarization: Bool

    /// Maximum utterance duration, if limited (nil = unlimited)
    let maxUtteranceDuration: TimeInterval?

    /// Supported locales/languages
    let supportedLocales: [Locale]

    /// Whether the engine requires network connectivity
    let requiresNetwork: Bool

    /// Privacy level indicator
    let privacyLevel: PrivacyLevel

    /// Approximate quality level for comparison
    let qualityLevel: QualityLevel

    /// Whether the engine requires a model download
    let requiresModelDownload: Bool

    /// Approximate model size in bytes (if applicable)
    let modelSizeBytes: Int64?

    init(
        supportsStreaming: Bool = true,
        supportsOnDevice: Bool = false,
        supportsPunctuation: Bool = true,
        supportsSpeakerDiarization: Bool = false,
        maxUtteranceDuration: TimeInterval? = nil,
        supportedLocales: [Locale] = [],
        requiresNetwork: Bool = true,
        privacyLevel: PrivacyLevel = .cloud,
        qualityLevel: QualityLevel = .medium,
        requiresModelDownload: Bool = false,
        modelSizeBytes: Int64? = nil
    ) {
        self.supportsStreaming = supportsStreaming
        self.supportsOnDevice = supportsOnDevice
        self.supportsPunctuation = supportsPunctuation
        self.supportsSpeakerDiarization = supportsSpeakerDiarization
        self.maxUtteranceDuration = maxUtteranceDuration
        self.supportedLocales = supportedLocales
        self.requiresNetwork = requiresNetwork
        self.privacyLevel = privacyLevel
        self.qualityLevel = qualityLevel
        self.requiresModelDownload = requiresModelDownload
        self.modelSizeBytes = modelSizeBytes
    }

    /// Check if a specific locale is supported
    func supportsLocale(_ locale: Locale) -> Bool {
        // Empty means all locales potentially supported (dynamic check needed)
        if supportedLocales.isEmpty { return true }
        return supportedLocales.contains { $0.identifier == locale.identifier }
    }
}

/// Privacy level of a speech engine
enum PrivacyLevel: String, Codable, Comparable {
    case local      // All processing on-device, most private
    case onDevice   // On-device but may use system APIs
    case cloud      // Data sent to provider's servers

    static func < (lhs: PrivacyLevel, rhs: PrivacyLevel) -> Bool {
        let order: [PrivacyLevel] = [.cloud, .onDevice, .local]
        guard let lhsIndex = order.firstIndex(of: lhs),
              let rhsIndex = order.firstIndex(of: rhs) else {
            return false
        }
        return lhsIndex < rhsIndex
    }

    var description: String {
        switch self {
        case .local:
            return "Fully local - data never leaves device"
        case .onDevice:
            return "On-device processing via system APIs"
        case .cloud:
            return "Cloud processing - data sent to servers"
        }
    }
}

/// Relative quality level of a speech engine
enum QualityLevel: String, Codable, Comparable {
    case low
    case medium
    case high
    case best

    static func < (lhs: QualityLevel, rhs: QualityLevel) -> Bool {
        let order: [QualityLevel] = [.low, .medium, .high, .best]
        guard let lhsIndex = order.firstIndex(of: lhs),
              let rhsIndex = order.firstIndex(of: rhs) else {
            return false
        }
        return lhsIndex < rhsIndex
    }
}

// MARK: - Preset Capabilities

extension SpeechEngineCapabilities {
    /// Capabilities for Apple Online (SFSpeechRecognizer, server-side)
    static let appleOnline = SpeechEngineCapabilities(
        supportsStreaming: true,
        supportsOnDevice: false,
        supportsPunctuation: true,
        supportsSpeakerDiarization: false,
        maxUtteranceDuration: 60,  // 1 minute limit per request
        supportedLocales: [],  // Dynamic based on device
        requiresNetwork: true,
        privacyLevel: .cloud,
        qualityLevel: .high,
        requiresModelDownload: false,
        modelSizeBytes: nil
    )

    /// Capabilities for Apple On-Device (SFSpeechRecognizer with requiresOnDeviceRecognition)
    static let appleOnDevice = SpeechEngineCapabilities(
        supportsStreaming: true,
        supportsOnDevice: true,
        supportsPunctuation: true,  // iOS 16+ with on-device
        supportsSpeakerDiarization: false,
        maxUtteranceDuration: nil,  // No limit for on-device
        supportedLocales: [],  // Dynamic based on device
        requiresNetwork: false,
        privacyLevel: .onDevice,
        qualityLevel: .medium,
        requiresModelDownload: false,  // Handled by iOS
        modelSizeBytes: nil
    )

    /// Capabilities for WhisperKit (local)
    static let whisperLocal = SpeechEngineCapabilities(
        supportsStreaming: false,  // Whisper processes full audio
        supportsOnDevice: true,
        supportsPunctuation: true,
        supportsSpeakerDiarization: false,
        maxUtteranceDuration: nil,
        supportedLocales: [],  // Whisper supports many languages
        requiresNetwork: false,
        privacyLevel: .local,
        qualityLevel: .high,
        requiresModelDownload: true,
        modelSizeBytes: 147_000_000  // ~140MB for base model
    )

    /// Capabilities for remote API (placeholder)
    static let remoteApi = SpeechEngineCapabilities(
        supportsStreaming: true,
        supportsOnDevice: false,
        supportsPunctuation: true,
        supportsSpeakerDiarization: true,
        maxUtteranceDuration: nil,
        supportedLocales: [],
        requiresNetwork: true,
        privacyLevel: .cloud,
        qualityLevel: .best,
        requiresModelDownload: false,
        modelSizeBytes: nil
    )
}

import Foundation

/// Configuration options for a speech recognition session
struct SpeechRecognitionOptions {
    /// Locale for recognition (determines language)
    let locale: Locale

    /// Prefer on-device recognition if available
    let preferOnDevice: Bool

    /// Maximum duration for the session (nil = unlimited)
    let maxDuration: TimeInterval?

    /// Whether to emit partial results during recognition
    let allowPartialResults: Bool

    /// Add punctuation to results (if supported by engine)
    let addPunctuation: Bool

    /// Task hint for better recognition accuracy
    let taskHint: TaskHint

    /// Context phrases that might appear (improves accuracy for domain-specific terms)
    let contextPhrases: [String]

    init(
        locale: Locale = .current,
        preferOnDevice: Bool = false,
        maxDuration: TimeInterval? = nil,
        allowPartialResults: Bool = true,
        addPunctuation: Bool = true,
        taskHint: TaskHint = .unspecified,
        contextPhrases: [String] = []
    ) {
        self.locale = locale
        self.preferOnDevice = preferOnDevice
        self.maxDuration = maxDuration
        self.allowPartialResults = allowPartialResults
        self.addPunctuation = addPunctuation
        self.taskHint = taskHint
        self.contextPhrases = contextPhrases
    }

    /// Create options optimized for dictation
    static func dictation(locale: Locale = .current, preferOnDevice: Bool = false) -> SpeechRecognitionOptions {
        SpeechRecognitionOptions(
            locale: locale,
            preferOnDevice: preferOnDevice,
            maxDuration: nil,
            allowPartialResults: true,
            addPunctuation: true,
            taskHint: .dictation,
            contextPhrases: []
        )
    }

    /// Create options optimized for commands
    static func commands(locale: Locale = .current, phrases: [String] = []) -> SpeechRecognitionOptions {
        SpeechRecognitionOptions(
            locale: locale,
            preferOnDevice: true,  // Commands benefit from low latency
            maxDuration: 10,  // Commands are usually short
            allowPartialResults: true,
            addPunctuation: false,
            taskHint: .command,
            contextPhrases: phrases
        )
    }

    /// Create options optimized for search queries
    static func search(locale: Locale = .current) -> SpeechRecognitionOptions {
        SpeechRecognitionOptions(
            locale: locale,
            preferOnDevice: false,  // Search benefits from cloud accuracy
            maxDuration: 30,
            allowPartialResults: true,
            addPunctuation: false,
            taskHint: .search,
            contextPhrases: []
        )
    }
}

/// Hint about the type of speech task for better recognition
enum TaskHint: String, Codable {
    case unspecified    // No specific hint
    case dictation      // General dictation
    case search         // Search queries
    case command        // Voice commands
    case confirmation   // Yes/No confirmations
}

/// Engine selection preferences
struct SpeechEngineSelection: Codable {
    /// Preferred engine to use
    let preferredId: SpeechEngineId

    /// Fallback order if preferred is unavailable
    let fallbackOrder: [SpeechEngineId]

    init(
        preferredId: SpeechEngineId,
        fallbackOrder: [SpeechEngineId] = []
    ) {
        self.preferredId = preferredId
        self.fallbackOrder = fallbackOrder
    }

    /// Default selection: Apple On-Device preferred, Apple Online fallback
    static let `default` = SpeechEngineSelection(
        preferredId: .appleOnDevice,
        fallbackOrder: [.appleOnline]
    )

    /// Privacy-first selection: only on-device options
    static let privacyFirst = SpeechEngineSelection(
        preferredId: .appleOnDevice,
        fallbackOrder: [.whisperLocal]
    )

    /// Quality-first selection: cloud options preferred
    static let qualityFirst = SpeechEngineSelection(
        preferredId: .appleOnline,
        fallbackOrder: [.appleOnDevice]
    )
}

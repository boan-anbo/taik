import Foundation

/// Represents a programmable button on the deck (Stream Deck-style)
/// Designed to be platform-agnostic (JSON serializable for cross-platform sync)
struct DeckButton: Codable, Identifiable, Equatable {
    let id: UUID
    var label: String
    var icon: String?  // SF Symbol name on iOS, mapped to platform-specific on others
    var action: ButtonAction
    var showInStrip: Bool  // Whether to show in compact strip mode
    var order: Int  // Sort order

    init(
        id: UUID = UUID(),
        label: String,
        icon: String? = nil,
        action: ButtonAction,
        showInStrip: Bool = false,
        order: Int = 0
    ) {
        self.id = id
        self.label = label
        self.icon = icon
        self.action = action
        self.showInStrip = showInStrip
        self.order = order
    }
}

/// Action types for deck buttons
/// v0: Only insertText is implemented
/// Future: openURL, runShortcut, voiceInput, etc.
enum ButtonAction: Codable, Equatable {
    case insertText(String)
    // Future action types:
    // case openURL(URL)
    // case runShortcut(String)  // iOS Shortcuts name
    // case voiceInput
    // case switchKeyboard
    // case custom(String)  // For extensibility

    /// JSON-compatible encoding for cross-platform sync
    enum CodingKeys: String, CodingKey {
        case type
        case payload
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "insertText":
            let payload = try container.decode(String.self, forKey: .payload)
            self = .insertText(payload)
        default:
            // Default to empty text for unknown action types (graceful fallback)
            self = .insertText("")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .insertText(let text):
            try container.encode("insertText", forKey: .type)
            try container.encode(text, forKey: .payload)
        }
    }

    /// Get the text to insert (if applicable)
    var textToInsert: String? {
        switch self {
        case .insertText(let text):
            return text
        }
    }
}

/// Transcription result from speech-to-text
struct TranscriptionResult: Codable {
    let id: UUID
    let text: String
    let timestamp: Date
    let language: String?
    let duration: TimeInterval?

    init(
        id: UUID = UUID(),
        text: String,
        timestamp: Date = Date(),
        language: String? = nil,
        duration: TimeInterval? = nil
    ) {
        self.id = id
        self.text = text
        self.timestamp = timestamp
        self.language = language
        self.duration = duration
    }
}

/// Model status for Whisper model management
enum ModelStatus: String, Codable {
    case missing
    case downloading
    case ready
    case error
}

/// Model information
struct ModelInfo: Codable {
    let modelId: String
    let path: String?
    let sizeBytes: Int64?
    var status: ModelStatus

    static let `default` = ModelInfo(
        modelId: "whisper-base",
        path: nil,
        sizeBytes: nil,
        status: .missing
    )
}

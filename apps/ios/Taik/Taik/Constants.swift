import Foundation

/// App-wide constants shared between main app and keyboard extension
enum Constants {
    /// App Group identifier for shared storage
    static let appGroupID = "group.app.carrel.taik"

    /// URL Schemes
    enum URLScheme {
        static let record = "taik://record"
        static let deck = "taik://deck"
        static let flow = "taik://flow"
    }

    /// Storage Keys
    enum StorageKey {
        static let deckButtons = "deckButtons"
        static let pendingTranscription = "pendingTranscription"
        static let modelPath = "modelPath"
        static let modelStatus = "modelStatus"
        // Flow Session keys
        static let flowSessionActive = "flowSessionActive"
        static let flowSessionExpiry = "flowSessionExpiry"
        static let flowCommand = "flowCommand"
        static let isCapturing = "isCapturing"
        // Tier 1: Background Auto-Enable
        static let requestFlowSession = "requestFlowSession"
        static let requestFlowSessionAt = "requestFlowSessionAt"
    }

    /// Flow Session defaults
    enum FlowSession {
        static let defaultTimeout: TimeInterval = 1800 // 30 minutes (long-lived to minimize enable frequency)
        static let pollingIntervalActive: TimeInterval = 0.15 // 150ms during capture
        static let pollingIntervalIdle: TimeInterval = 0.5 // 500ms when idle
        static let transcriptionTimeout: TimeInterval = 10 // 10 seconds max wait
        static let tier1Timeout: TimeInterval = 1.5 // 1.5 seconds for background enable
    }

    /// Default deck buttons for first launch
    static let defaultButtons: [DeckButton] = [
        DeckButton(
            id: UUID(),
            label: "Clarify",
            icon: "questionmark.circle",
            action: .insertText("Could you clarify "),
            showInStrip: true,
            order: 0
        ),
        DeckButton(
            id: UUID(),
            label: "Summarize",
            icon: "list.bullet",
            action: .insertText("Please summarize the above in 3 bullet points."),
            showInStrip: true,
            order: 1
        ),
        DeckButton(
            id: UUID(),
            label: "Code",
            icon: "chevron.left.forwardslash.chevron.right",
            action: .insertText("Show me the code for this."),
            showInStrip: true,
            order: 2
        ),
        DeckButton(
            id: UUID(),
            label: "Explain",
            icon: "lightbulb",
            action: .insertText("Explain this like I'm a beginner."),
            showInStrip: false,
            order: 3
        )
    ]
}

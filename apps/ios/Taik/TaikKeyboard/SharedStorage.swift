import Foundation

/// Manages shared storage between main app and keyboard extension via App Groups
/// Thread-safe and provides reactive updates via closures
final class SharedStorage {
    static let shared = SharedStorage()

    private let userDefaults: UserDefaults?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    /// Callbacks for observing changes
    var onButtonsChanged: (([DeckButton]) -> Void)?
    var onPendingTranscriptionChanged: ((String?) -> Void)?
    var onFlowSessionChanged: ((Bool) -> Void)?
    var onCapturingChanged: ((Bool) -> Void)?

    private init() {
        self.userDefaults = UserDefaults(suiteName: Constants.appGroupID)

        if userDefaults == nil {
            print("⚠️ SharedStorage: Failed to access App Group. Make sure '\(Constants.appGroupID)' is configured in entitlements.")
        }

        // Set up defaults on first launch
        if buttons.isEmpty {
            buttons = Constants.defaultButtons
        }
    }

    // MARK: - Deck Buttons

    /// All deck buttons, sorted by order
    var buttons: [DeckButton] {
        get {
            guard let data = userDefaults?.data(forKey: Constants.StorageKey.deckButtons),
                  let buttons = try? decoder.decode([DeckButton].self, from: data) else {
                return []
            }
            return buttons.sorted { $0.order < $1.order }
        }
        set {
            guard let data = try? encoder.encode(newValue) else { return }
            userDefaults?.set(data, forKey: Constants.StorageKey.deckButtons)
            onButtonsChanged?(newValue)
        }
    }

    /// Buttons marked to show in strip mode
    var stripButtons: [DeckButton] {
        buttons.filter { $0.showInStrip }
    }

    /// Add a new button
    func addButton(_ button: DeckButton) {
        var current = buttons
        var newButton = button
        newButton.order = (current.map { $0.order }.max() ?? -1) + 1
        current.append(newButton)
        buttons = current
    }

    /// Update an existing button
    func updateButton(_ button: DeckButton) {
        var current = buttons
        if let index = current.firstIndex(where: { $0.id == button.id }) {
            current[index] = button
            buttons = current
        }
    }

    /// Delete a button
    func deleteButton(id: UUID) {
        var current = buttons
        current.removeAll { $0.id == id }
        buttons = current
    }

    /// Reorder buttons
    func reorderButtons(_ buttons: [DeckButton]) {
        var reordered = buttons
        for i in 0..<reordered.count {
            reordered[i].order = i
        }
        self.buttons = reordered
    }

    // MARK: - Pending Transcription

    /// Pending transcription text to be inserted by keyboard
    var pendingTranscription: String? {
        get {
            userDefaults?.string(forKey: Constants.StorageKey.pendingTranscription)
        }
        set {
            if let value = newValue {
                userDefaults?.set(value, forKey: Constants.StorageKey.pendingTranscription)
            } else {
                userDefaults?.removeObject(forKey: Constants.StorageKey.pendingTranscription)
            }
            onPendingTranscriptionChanged?(newValue)
        }
    }

    /// Check if there's pending transcription to insert
    var hasPendingTranscription: Bool {
        pendingTranscription != nil && !(pendingTranscription?.isEmpty ?? true)
    }

    /// Consume and clear pending transcription (called by keyboard after insertion)
    func consumePendingTranscription() -> String? {
        let text = pendingTranscription
        pendingTranscription = nil
        return text
    }

    // MARK: - Model Info

    /// Current Whisper model information
    var modelInfo: ModelInfo {
        get {
            guard let data = userDefaults?.data(forKey: Constants.StorageKey.modelPath),
                  let info = try? decoder.decode(ModelInfo.self, from: data) else {
                return .default
            }
            return info
        }
        set {
            guard let data = try? encoder.encode(newValue) else { return }
            userDefaults?.set(data, forKey: Constants.StorageKey.modelPath)
        }
    }

    /// Update model status
    func updateModelStatus(_ status: ModelStatus) {
        var info = modelInfo
        info.status = status
        modelInfo = info
    }

    // MARK: - Flow Session State

    /// Whether a Flow Session is currently active
    var flowSessionActive: Bool {
        get {
            userDefaults?.bool(forKey: Constants.StorageKey.flowSessionActive) ?? false
        }
        set {
            userDefaults?.set(newValue, forKey: Constants.StorageKey.flowSessionActive)
            onFlowSessionChanged?(newValue)
        }
    }

    /// When the current Flow Session expires
    var flowSessionExpiry: Date? {
        get {
            userDefaults?.object(forKey: Constants.StorageKey.flowSessionExpiry) as? Date
        }
        set {
            if let date = newValue {
                userDefaults?.set(date, forKey: Constants.StorageKey.flowSessionExpiry)
            } else {
                userDefaults?.removeObject(forKey: Constants.StorageKey.flowSessionExpiry)
            }
        }
    }

    /// Check if Flow Session has expired
    var isFlowSessionExpired: Bool {
        guard let expiry = flowSessionExpiry else { return true }
        return Date() > expiry
    }

    /// Command from keyboard to main app: "startCapture" | "stopCapture" | nil
    var flowCommand: String? {
        get {
            userDefaults?.string(forKey: Constants.StorageKey.flowCommand)
        }
        set {
            if let value = newValue {
                userDefaults?.set(value, forKey: Constants.StorageKey.flowCommand)
            } else {
                userDefaults?.removeObject(forKey: Constants.StorageKey.flowCommand)
            }
        }
    }

    /// Whether the main app is currently capturing audio
    var isCapturing: Bool {
        get {
            userDefaults?.bool(forKey: Constants.StorageKey.isCapturing) ?? false
        }
        set {
            userDefaults?.set(newValue, forKey: Constants.StorageKey.isCapturing)
            onCapturingChanged?(newValue)
        }
    }

    /// Consume the flow command (called by main app after processing)
    func consumeFlowCommand() -> String? {
        let command = flowCommand
        flowCommand = nil
        return command
    }

    /// Start a new Flow Session
    func startFlowSession(timeout: TimeInterval = Constants.FlowSession.defaultTimeout) {
        flowSessionExpiry = Date().addingTimeInterval(timeout)
        flowSessionActive = true
        isCapturing = false
        flowCommand = nil
        pendingTranscription = nil
    }

    /// End the current Flow Session
    func endFlowSession() {
        flowSessionActive = false
        flowSessionExpiry = nil
        isCapturing = false
        flowCommand = nil
        requestFlowSession = false
    }

    // MARK: - Tier 1: Background Auto-Enable

    /// Keyboard sets this to request a Flow Session without opening the app
    var requestFlowSession: Bool {
        get {
            userDefaults?.bool(forKey: Constants.StorageKey.requestFlowSession) ?? false
        }
        set {
            userDefaults?.set(newValue, forKey: Constants.StorageKey.requestFlowSession)
        }
    }

    /// When the request was made (for timeout calculation)
    var requestFlowSessionAt: Date? {
        get {
            userDefaults?.object(forKey: Constants.StorageKey.requestFlowSessionAt) as? Date
        }
        set {
            if let date = newValue {
                userDefaults?.set(date, forKey: Constants.StorageKey.requestFlowSessionAt)
            } else {
                userDefaults?.removeObject(forKey: Constants.StorageKey.requestFlowSessionAt)
            }
        }
    }

    /// Clear the request (called by main app after processing)
    func clearFlowSessionRequest() {
        requestFlowSession = false
        requestFlowSessionAt = nil
    }

    // MARK: - Polling (for keyboard extension)

    /// Start polling for pending transcription changes
    /// Call this from keyboard extension to detect when main app writes transcription
    func startPollingForTranscription(interval: TimeInterval = 0.5, callback: @escaping (String) -> Void) -> Timer {
        Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            if let text = self?.consumePendingTranscription(), !text.isEmpty {
                callback(text)
            }
        }
    }

    // MARK: - Debug

    /// Force sync (useful for debugging)
    func synchronize() {
        userDefaults?.synchronize()
    }
}

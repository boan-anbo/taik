import Foundation
import AVFoundation

/// Manages Flow Sessions for in-keyboard voice dictation
/// Flow Sessions allow the keyboard to trigger recording without a visible app switch
@MainActor
class FlowSessionManager: NSObject, ObservableObject {
    static let shared = FlowSessionManager()

    // MARK: - Published State

    @Published var isSessionActive = false
    @Published var isCapturing = false
    @Published var sessionExpiresAt: Date?
    @Published var lastError: String?
    @Published var partialTranscription: String = ""

    // MARK: - Speech Configuration

    /// Engine selection preferences
    var engineSelection: SpeechEngineSelection = .default

    /// Post-processor to use (defaults to NoOp)
    var postProcessor: TranscriptPostProcessor = NoOpProcessor()

    /// Transcript style for post-processing
    var transcriptStyle: TranscriptStyle = .dictationCleaned

    // MARK: - Private Properties

    private var pollingTimer: Timer?
    private var requestPollingTimer: Timer?  // Tier 1: polls for background enable requests

    // Speech recognition
    private let speechRouter = SpeechRouter.shared
    private var activeSpeechSession: SpeechSession?

    // Silent audio player to keep app alive in background
    private var silentAudioPlayer: AVAudioPlayer?

    // MARK: - Lifecycle

    private override init() {
        super.init()

        // Register speech engines
        registerEngines()

        // Sync state from SharedStorage on init
        syncStateFromStorage()

        // Start Tier 1 request polling (always runs when app is alive)
        startRequestPolling()
    }

    private func registerEngines() {
        // Register Apple Speech engines
        speechRouter.register(engine: AppleSpeechEngine.online())
        speechRouter.register(engine: AppleSpeechEngine.onDevice())

        // Note: WhisperEngine and RemoteApiEngine are stubs for now
        // speechRouter.register(engine: WhisperEngine())

        print("[FlowSessionManager] Speech engines registered")
    }

    // MARK: - Public API

    /// Start a new Flow Session
    /// - Parameter timeout: How long the session should last (default 30 minutes)
    func startFlowSession(timeout: TimeInterval = Constants.FlowSession.defaultTimeout) {
        print("[FlowSessionManager] Starting Flow Session with timeout: \(timeout)s")

        do {
            // Configure audio session for background recording
            try configureAudioSession()

            // Start silent audio to keep app alive in background
            startSilentAudio()

            // Update shared storage
            SharedStorage.shared.startFlowSession(timeout: timeout)

            // Update local state
            isSessionActive = true
            sessionExpiresAt = Date().addingTimeInterval(timeout)
            isCapturing = false
            lastError = nil
            partialTranscription = ""

            // Start polling for keyboard commands
            startPolling()

            print("[FlowSessionManager] Flow Session started successfully")
        } catch {
            print("[FlowSessionManager] Failed to start Flow Session: \(error)")
            lastError = error.localizedDescription
        }
    }

    /// End the current Flow Session
    func endFlowSession() {
        print("[FlowSessionManager] Ending Flow Session")

        // Stop any active recognition
        if isCapturing {
            stopCapturing(transcribe: false)
        }

        // Stop polling
        stopPolling()

        // Stop silent audio
        stopSilentAudio()

        // Deactivate audio session
        deactivateAudioSession()

        // Update shared storage
        SharedStorage.shared.endFlowSession()

        // Update local state
        isSessionActive = false
        sessionExpiresAt = nil
        isCapturing = false
        partialTranscription = ""

        print("[FlowSessionManager] Flow Session ended")
    }

    /// Get remaining time in current session
    var remainingTime: TimeInterval? {
        guard let expiry = sessionExpiresAt else { return nil }
        return max(0, expiry.timeIntervalSinceNow)
    }

    /// Formatted remaining time string
    var remainingTimeString: String {
        guard let remaining = remainingTime else { return "No active session" }
        let minutes = Int(remaining) / 60
        let seconds = Int(remaining) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    /// Check if speech recognition is available
    func checkSpeechAvailability() async -> Bool {
        let options = SpeechRecognitionOptions.dictation()
        return await speechRouter.hasAvailableEngine(for: options)
    }

    /// Request speech recognition authorization
    func requestSpeechAuthorization() async -> Bool {
        let options = SpeechRecognitionOptions.dictation()
        guard let engine = await speechRouter.preferredEngine(for: options, selection: engineSelection) else {
            return false
        }
        let result = await engine.requestAuthorization()
        if case .success = result {
            return true
        }
        return false
    }

    // MARK: - Audio Session Configuration

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .mixWithOthers])
        try session.setActive(true)
        print("[FlowSessionManager] Audio session configured for background recording")
    }

    private func deactivateAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            print("[FlowSessionManager] Audio session deactivated")
        } catch {
            print("[FlowSessionManager] Failed to deactivate audio session: \(error)")
        }
    }

    // MARK: - Silent Audio (Keeps App Alive in Background)

    private func startSilentAudio() {
        let sampleRate: Double = 8000
        let duration: Double = 1.0
        let numSamples = Int(sampleRate * duration)

        let audioData = Data(count: numSamples * 2)

        var wavData = Data()
        wavData.append(contentsOf: "RIFF".utf8)
        let fileSize = UInt32(36 + audioData.count)
        wavData.append(contentsOf: withUnsafeBytes(of: fileSize.littleEndian) { Array($0) })
        wavData.append(contentsOf: "WAVE".utf8)
        wavData.append(contentsOf: "fmt ".utf8)
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(16).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(8000).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(16000).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt16(2).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt16(16).littleEndian) { Array($0) })
        wavData.append(contentsOf: "data".utf8)
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(audioData.count).littleEndian) { Array($0) })
        wavData.append(audioData)

        do {
            silentAudioPlayer = try AVAudioPlayer(data: wavData)
            silentAudioPlayer?.numberOfLoops = -1
            silentAudioPlayer?.volume = 0.0
            silentAudioPlayer?.play()
            print("[FlowSessionManager] Silent audio started - app will stay alive in background")
        } catch {
            print("[FlowSessionManager] Failed to start silent audio: \(error)")
        }
    }

    private func stopSilentAudio() {
        silentAudioPlayer?.stop()
        silentAudioPlayer = nil
        print("[FlowSessionManager] Silent audio stopped")
    }

    // MARK: - Polling

    private func startPolling() {
        stopPolling()

        let interval = Constants.FlowSession.pollingIntervalIdle

        pollingTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.pollForCommands()
            }
        }

        print("[FlowSessionManager] Started polling at \(interval)s interval")
    }

    private func stopPolling() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    // MARK: - Tier 1: Request Polling (Background Auto-Enable)

    private func startRequestPolling() {
        stopRequestPolling()

        requestPollingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.pollForRequests()
            }
        }

        print("[FlowSessionManager] Started Tier 1 request polling")
    }

    private func stopRequestPolling() {
        requestPollingTimer?.invalidate()
        requestPollingTimer = nil
    }

    private func pollForRequests() {
        let storage = SharedStorage.shared

        if storage.requestFlowSession && !isSessionActive {
            print("[FlowSessionManager] Tier 1: Received background enable request from keyboard")

            storage.clearFlowSessionRequest()
            startFlowSession()

            print("[FlowSessionManager] Tier 1: Flow session auto-enabled")
        }
    }

    private func updatePollingInterval() {
        guard pollingTimer != nil else { return }

        let interval = isCapturing
            ? Constants.FlowSession.pollingIntervalActive
            : Constants.FlowSession.pollingIntervalIdle

        stopPolling()

        pollingTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.pollForCommands()
            }
        }

        print("[FlowSessionManager] Updated polling interval to \(interval)s")
    }

    private func pollForCommands() {
        if SharedStorage.shared.isFlowSessionExpired {
            print("[FlowSessionManager] Session expired, ending...")
            endFlowSession()
            return
        }

        if let command = SharedStorage.shared.consumeFlowCommand() {
            print("[FlowSessionManager] Received command: \(command)")
            handleCommand(command)
        }
    }

    // MARK: - Command Handling

    private func handleCommand(_ command: String) {
        switch command {
        case "startCapture":
            startCapturing()
        case "stopCapture":
            stopCapturing(transcribe: true)
        default:
            print("[FlowSessionManager] Unknown command: \(command)")
        }
    }

    private func startCapturing() {
        guard !isCapturing else {
            print("[FlowSessionManager] Already capturing, ignoring start command")
            return
        }

        print("[FlowSessionManager] Starting capture with speech recognition...")

        Task {
            do {
                // Create recognition options
                let options = SpeechRecognitionOptions.dictation(
                    locale: .current,
                    preferOnDevice: engineSelection.preferredId == .appleOnDevice
                )

                // Start a speech session through the router
                let session = try await speechRouter.startSession(
                    options: options,
                    selection: engineSelection
                )

                // Store the active session
                activeSpeechSession = session

                // Set up callbacks
                session.onPartialResult = { [weak self] result in
                    Task { @MainActor in
                        self?.partialTranscription = result.text
                        print("[FlowSessionManager] Partial: \(result.text.prefix(50))...")
                    }
                }

                session.onFinalResult = { [weak self] result in
                    Task { @MainActor in
                        await self?.handleFinalResult(result)
                    }
                }

                session.onError = { [weak self] error in
                    Task { @MainActor in
                        self?.handleRecognitionError(error)
                    }
                }

                session.onStateChange = { [weak self] state in
                    Task { @MainActor in
                        self?.handleSessionStateChange(state)
                    }
                }

                // Start listening
                try session.startListening()

                // Update state
                isCapturing = true
                SharedStorage.shared.isCapturing = true
                partialTranscription = ""

                // Switch to faster polling during capture
                updatePollingInterval()

                print("[FlowSessionManager] Capture started with engine: \(session.engineId.displayName)")

            } catch {
                print("[FlowSessionManager] Failed to start capture: \(error)")
                lastError = error.localizedDescription
                SharedStorage.shared.isCapturing = false
            }
        }
    }

    private func stopCapturing(transcribe: Bool) {
        guard isCapturing else {
            print("[FlowSessionManager] Not capturing, ignoring stop command")
            return
        }

        print("[FlowSessionManager] Stopping capture (transcribe: \(transcribe))...")

        if transcribe {
            // Stop the session and wait for final result
            activeSpeechSession?.stop()
        } else {
            // Cancel without waiting for result
            activeSpeechSession?.cancel()
            activeSpeechSession = nil
        }

        // Update state
        isCapturing = false
        SharedStorage.shared.isCapturing = false

        // Switch to slower polling
        updatePollingInterval()
    }

    // MARK: - Recognition Callbacks

    private func handleFinalResult(_ result: SpeechResult) async {
        print("[FlowSessionManager] Final result: \(result.text.prefix(50))...")

        // Post-process the transcription
        let processedText: String
        do {
            processedText = try await postProcessor.process(
                raw: result.text,
                locale: .current,
                style: transcriptStyle
            )
        } catch {
            print("[FlowSessionManager] Post-processing failed, using raw text: \(error)")
            processedText = result.text
        }

        // Write transcription to shared storage for keyboard to pick up
        SharedStorage.shared.pendingTranscription = processedText

        // Clean up
        activeSpeechSession = nil
        partialTranscription = ""

        print("[FlowSessionManager] Transcription complete and stored")
    }

    private func handleRecognitionError(_ error: SpeechEngineError) {
        let description = error.localizedDescription
        print("[FlowSessionManager] Recognition error: \(description)")
        lastError = description
        activeSpeechSession = nil
        isCapturing = false
        SharedStorage.shared.isCapturing = false
    }

    private func handleSessionStateChange(_ state: SpeechSessionState) {
        print("[FlowSessionManager] Session state: \(state)")

        switch state {
        case .completed, .cancelled, .failed:
            if activeSpeechSession != nil {
                activeSpeechSession = nil
            }
        default:
            break
        }
    }

    // MARK: - State Sync

    private func syncStateFromStorage() {
        isSessionActive = SharedStorage.shared.flowSessionActive && !SharedStorage.shared.isFlowSessionExpired
        sessionExpiresAt = SharedStorage.shared.flowSessionExpiry
        isCapturing = SharedStorage.shared.isCapturing

        if isSessionActive {
            do {
                try configureAudioSession()
                startSilentAudio()
                startPolling()
                print("[FlowSessionManager] Resumed existing Flow Session")
            } catch {
                print("[FlowSessionManager] Failed to resume session: \(error)")
                endFlowSession()
            }
        }
    }
}

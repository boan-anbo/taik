import Foundation
import Speech
import AVFoundation

/// Speech engine implementation using Apple's SFSpeechRecognizer
/// Supports both online (server-side) and on-device recognition modes
final class AppleSpeechEngine: SpeechEngine {
    let id: SpeechEngineId
    private let recognizer: SFSpeechRecognizer?
    private var activeSession: AppleSpeechSession?

    /// Create an Apple Speech engine
    /// - Parameter mode: Whether to use online or on-device recognition
    init(mode: SpeechEngineId) {
        precondition(mode == .appleOnline || mode == .appleOnDevice,
                     "AppleSpeechEngine only supports appleOnline or appleOnDevice modes")
        self.id = mode
        self.recognizer = SFSpeechRecognizer()
    }

    /// Create engine for a specific locale
    init(mode: SpeechEngineId, locale: Locale) {
        precondition(mode == .appleOnline || mode == .appleOnDevice,
                     "AppleSpeechEngine only supports appleOnline or appleOnDevice modes")
        self.id = mode
        self.recognizer = SFSpeechRecognizer(locale: locale)
    }

    var capabilities: SpeechEngineCapabilities {
        switch id {
        case .appleOnDevice:
            return .appleOnDevice
        default:
            return .appleOnline
        }
    }

    func checkAvailability() async -> Result<Void, SpeechEngineError> {
        // Check if recognizer is available
        guard let recognizer = recognizer, recognizer.isAvailable else {
            return .failure(.recognizerNotAvailable)
        }

        // For on-device mode, check if on-device recognition is supported
        if id == .appleOnDevice {
            guard recognizer.supportsOnDeviceRecognition else {
                return .failure(.onDeviceNotSupported(recognizer.locale))
            }
        }

        // Check authorization status
        let status = SFSpeechRecognizer.authorizationStatus()
        switch status {
        case .authorized:
            return .success(())
        case .denied:
            return .failure(.authorizationDenied)
        case .restricted:
            return .failure(.authorizationRestricted)
        case .notDetermined:
            // Will need to request authorization
            return .success(())
        @unknown default:
            return .success(())
        }
    }

    func requestAuthorization() async -> Result<Void, SpeechEngineError> {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                switch status {
                case .authorized:
                    continuation.resume(returning: .success(()))
                case .denied:
                    continuation.resume(returning: .failure(.authorizationDenied))
                case .restricted:
                    continuation.resume(returning: .failure(.authorizationRestricted))
                case .notDetermined:
                    continuation.resume(returning: .failure(.authorizationDenied))
                @unknown default:
                    continuation.resume(returning: .failure(.authorizationDenied))
                }
            }
        }
    }

    func startSession(options: SpeechRecognitionOptions) async throws -> SpeechSession {
        // Check availability first
        let availability = await checkAvailability()
        if case .failure(let error) = availability {
            throw error
        }

        // Request authorization if needed
        let status = SFSpeechRecognizer.authorizationStatus()
        if status == .notDetermined {
            let authResult = await requestAuthorization()
            if case .failure(let error) = authResult {
                throw error
            }
        }

        // Ensure we have a recognizer
        guard let recognizer = recognizer else {
            throw SpeechEngineError.recognizerNotAvailable
        }

        // Create a new session
        let session = AppleSpeechSession(
            recognizer: recognizer,
            engineId: id,
            options: options
        )

        activeSession = session
        return session
    }
}

/// Active speech recognition session using Apple's Speech framework
final class AppleSpeechSession: NSObject, SpeechSession {
    let engineId: SpeechEngineId
    let options: SpeechRecognitionOptions

    private let recognizer: SFSpeechRecognizer
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    private(set) var state: SpeechSessionState = .idle {
        didSet {
            if state != oldValue {
                onStateChange?(state)
            }
        }
    }

    var onPartialResult: ((SpeechResult) -> Void)?
    var onFinalResult: ((SpeechResult) -> Void)?
    var onError: ((SpeechEngineError) -> Void)?
    var onStateChange: ((SpeechSessionState) -> Void)?

    init(recognizer: SFSpeechRecognizer, engineId: SpeechEngineId, options: SpeechRecognitionOptions) {
        self.recognizer = recognizer
        self.engineId = engineId
        self.options = options
        super.init()
    }

    deinit {
        cancel()
    }

    // MARK: - Audio Input

    func feedAudio(_ buffer: AVAudioPCMBuffer) {
        recognitionRequest?.append(buffer)
    }

    func startListening() throws {
        guard state == .idle else {
            throw SpeechEngineError.sessionAlreadyActive
        }

        // Create and configure the request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else {
            throw SpeechEngineError.recognizerNotAvailable
        }

        // Configure request
        request.shouldReportPartialResults = options.allowPartialResults

        // Enable on-device recognition if requested and supported
        if engineId == .appleOnDevice && recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }

        // Add punctuation if supported (iOS 16+)
        if #available(iOS 16.0, *) {
            request.addsPunctuation = options.addPunctuation
        }

        // Add context phrases for improved accuracy
        if !options.contextPhrases.isEmpty {
            request.contextualStrings = options.contextPhrases
        }

        // Set task hint if available (iOS 17+)
        if #available(iOS 17, *) {
            switch options.taskHint {
            case .dictation:
                request.taskHint = .dictation
            case .search:
                request.taskHint = .search
            case .confirmation:
                request.taskHint = .confirmation
            default:
                request.taskHint = .unspecified
            }
        }

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Configure audio engine input
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()

        // Start recognition task
        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            self?.handleRecognitionResult(result: result, error: error)
        }

        state = .listening
        print("[AppleSpeechSession] Started listening with \(engineId.rawValue)")
    }

    func stop() {
        guard state == .listening || state == .processing else {
            return
        }

        print("[AppleSpeechSession] Stopping...")
        state = .processing

        // Stop audio engine
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        // End the recognition request
        recognitionRequest?.endAudio()
    }

    func cancel() {
        print("[AppleSpeechSession] Cancelling...")

        // Stop audio engine
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }

        // Cancel recognition task
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil

        if !state.isTerminal {
            state = .cancelled
        }
    }

    // MARK: - Private Methods

    private func handleRecognitionResult(result: SFSpeechRecognitionResult?, error: Error?) {
        if let error = error {
            print("[AppleSpeechSession] Recognition error: \(error)")
            let speechError = SpeechEngineError.recognitionFailed(error)
            state = .failed(error.localizedDescription)
            onError?(speechError)
            cleanup()
            return
        }

        guard let result = result else {
            return
        }

        let transcription = result.bestTranscription
        let text = transcription.formattedString

        // Build speech segments from transcription segments
        let segments = transcription.segments.map { segment in
            SpeechSegment(
                text: segment.substring,
                startTime: segment.timestamp,
                endTime: segment.timestamp + segment.duration,
                confidence: segment.confidence
            )
        }

        // Get alternatives if available
        let alternatives = result.transcriptions.dropFirst().prefix(3).map { $0.formattedString }

        let speechResult = SpeechResult(
            text: text,
            isFinal: result.isFinal,
            confidence: segments.first?.confidence,
            alternatives: Array(alternatives),
            segments: segments
        )

        if result.isFinal {
            print("[AppleSpeechSession] Final result: \(text.prefix(50))...")
            state = .completed
            onFinalResult?(speechResult)
            cleanup()
        } else {
            onPartialResult?(speechResult)
        }
    }

    private func cleanup() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        recognitionTask = nil
        recognitionRequest = nil
    }
}

// MARK: - Factory Methods

extension AppleSpeechEngine {
    /// Create an Apple Online engine (server-side processing)
    static func online(locale: Locale = .current) -> AppleSpeechEngine {
        AppleSpeechEngine(mode: .appleOnline, locale: locale)
    }

    /// Create an Apple On-Device engine (local processing)
    static func onDevice(locale: Locale = .current) -> AppleSpeechEngine {
        AppleSpeechEngine(mode: .appleOnDevice, locale: locale)
    }

    /// Check if on-device recognition is available for the current locale
    static func isOnDeviceAvailable(for locale: Locale = .current) -> Bool {
        guard let recognizer = SFSpeechRecognizer(locale: locale) else {
            return false
        }
        return recognizer.supportsOnDeviceRecognition
    }

    /// Get all supported locales for Apple Speech
    static var supportedLocales: Set<Locale> {
        SFSpeechRecognizer.supportedLocales()
    }
}

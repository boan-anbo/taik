import Foundation
import AVFoundation

/// Error types for audio recording
enum AudioRecorderError: LocalizedError {
    case permissionDenied
    case recordingFailed(String)
    case noRecordingAvailable

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Microphone access denied. Please enable in Settings."
        case .recordingFailed(let reason):
            return "Recording failed: \(reason)"
        case .noRecordingAvailable:
            return "No recording available"
        }
    }
}

/// Handles audio recording for speech-to-text
@MainActor
class AudioRecorder: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var recordingDuration: TimeInterval = 0

    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var timer: Timer?

    override init() {
        super.init()
    }

    /// Request microphone permission
    func requestPermission() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    /// Start recording audio
    func startRecording() async throws {
        // Check permission
        let hasPermission = await requestPermission()
        guard hasPermission else {
            throw AudioRecorderError.permissionDenied
        }

        // Configure audio session
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)

        // Create recording URL
        let documentsPath = FileManager.default.temporaryDirectory
        let fileName = "recording_\(Date().timeIntervalSince1970).m4a"
        recordingURL = documentsPath.appendingPathComponent(fileName)

        guard let url = recordingURL else {
            throw AudioRecorderError.recordingFailed("Could not create recording file")
        }

        // Recording settings optimized for speech recognition
        // WhisperKit expects 16kHz mono audio
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        audioRecorder = try AVAudioRecorder(url: url, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.record()

        isRecording = true
        recordingDuration = 0

        // Start duration timer
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.recordingDuration = self?.audioRecorder?.currentTime ?? 0
            }
        }
    }

    /// Stop recording and return the audio file URL
    func stopRecording() async throws -> URL {
        timer?.invalidate()
        timer = nil

        guard let recorder = audioRecorder, recorder.isRecording else {
            throw AudioRecorderError.noRecordingAvailable
        }

        recorder.stop()
        isRecording = false

        guard let url = recordingURL else {
            throw AudioRecorderError.noRecordingAvailable
        }

        // Verify file exists
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw AudioRecorderError.recordingFailed("Recording file not found")
        }

        return url
    }

    /// Cancel current recording
    func cancelRecording() {
        timer?.invalidate()
        timer = nil
        audioRecorder?.stop()
        audioRecorder?.deleteRecording()
        isRecording = false
        recordingDuration = 0
    }
}

extension AudioRecorder: AVAudioRecorderDelegate {
    nonisolated func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        Task { @MainActor in
            if !flag {
                print("Recording finished with error")
            }
        }
    }

    nonisolated func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        Task { @MainActor in
            if let error = error {
                print("Recording encode error: \(error)")
            }
        }
    }
}

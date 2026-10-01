import SwiftUI
import AVFoundation

struct RecordingView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var flowManager = FlowSessionManager.shared
    @State private var transcriptionText = ""
    @State private var showError = false
    @State private var errorMessage = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            // Transcription result area
            if !transcriptionText.isEmpty {
                transcriptionResultView
                    .padding()
            } else if !flowManager.partialTranscription.isEmpty {
                partialTranscriptionView
                    .padding()
            }

            Spacer()

            // Status text
            Text(statusText)
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Mic button
            micButton
                .padding(.vertical, 32)

            Spacer()

            // Action buttons when transcription is available
            if !transcriptionText.isEmpty {
                actionButtons
                    .padding(.bottom, 16)
            }
        }
        .navigationTitle("Record")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if appState.showRecordingView {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            if appState.shouldAutoStartRecording {
                appState.shouldAutoStartRecording = false
                startRecording()
            }
        }
        .onChange(of: flowManager.isCapturing) { _, isCapturing in
            if !isCapturing && flowManager.partialTranscription.isEmpty == false {
                // Capture stopped, check for result
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .init("TranscriptionComplete"))) { notification in
            if let text = notification.object as? String {
                transcriptionText = text
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") {}
        } message: {
            Text(errorMessage)
        }
    }

    private var statusText: String {
        if flowManager.isCapturing {
            return "Listening... Tap to stop"
        } else if !flowManager.partialTranscription.isEmpty {
            return "Processing..."
        } else if transcriptionText.isEmpty {
            return "Tap to start recording"
        } else {
            return "Tap to record again"
        }
    }

    private var micButton: some View {
        Button(action: toggleRecording) {
            ZStack {
                Circle()
                    .fill(micButtonColor)
                    .frame(width: 100, height: 100)
                    .shadow(color: micButtonColor.opacity(0.4), radius: 12)

                if !flowManager.partialTranscription.isEmpty && !flowManager.isCapturing {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(.white)
                } else {
                    Image(systemName: flowManager.isCapturing ? "stop.fill" : "mic.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.white)
                }
            }
        }
        .disabled(!flowManager.partialTranscription.isEmpty && !flowManager.isCapturing)
        .scaleEffect(flowManager.isCapturing ? 1.05 : 1.0)
        .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: flowManager.isCapturing)
    }

    private var micButtonColor: Color {
        if !flowManager.partialTranscription.isEmpty && !flowManager.isCapturing {
            return .orange
        } else if flowManager.isCapturing {
            return .red
        } else {
            return .blue
        }
    }

    private var partialTranscriptionView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Listening...")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                Spacer()
            }

            Text(flowManager.partialTranscription)
                .font(.body)
                .foregroundColor(.primary.opacity(0.7))
                .italic()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
        }
    }

    private var transcriptionResultView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Transcription")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                Spacer()
            }

            Text(transcriptionText)
                .font(.body)
                .foregroundColor(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
        }
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            // Send to keyboard button
            Button(action: sendToKeyboard) {
                HStack {
                    Image(systemName: "keyboard")
                    Text("Insert via Keyboard")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }

            // Copy button
            Button(action: copyToClipboard) {
                HStack {
                    Image(systemName: "doc.on.doc")
                    Text("Copy to Clipboard")
                }
                .font(.subheadline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray5))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }
        }
        .padding(.horizontal)
    }

    private func toggleRecording() {
        if flowManager.isCapturing {
            stopRecording()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        // Ensure flow session is active
        if !flowManager.isSessionActive {
            flowManager.startFlowSession()
        }

        // Clear previous transcription
        transcriptionText = ""

        // Send start command through shared storage
        SharedStorage.shared.flowCommand = "startCapture"
    }

    private func stopRecording() {
        // Send stop command through shared storage
        SharedStorage.shared.flowCommand = "stopCapture"

        // Check for pending transcription after a delay
        Task {
            try? await Task.sleep(nanoseconds: 500_000_000)  // 0.5 seconds

            // Poll for transcription
            for _ in 0..<20 {  // Try for up to 10 seconds
                if let text = SharedStorage.shared.consumePendingTranscription(), !text.isEmpty {
                    await MainActor.run {
                        transcriptionText = text
                    }
                    break
                }
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
        }
    }

    private func sendToKeyboard() {
        SharedStorage.shared.pendingTranscription = transcriptionText
        dismiss()
    }

    private func copyToClipboard() {
        UIPasteboard.general.string = transcriptionText
    }
}

#Preview {
    NavigationStack {
        RecordingView()
            .environmentObject(AppState())
    }
}

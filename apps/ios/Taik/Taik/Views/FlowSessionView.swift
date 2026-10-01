import SwiftUI

/// View for managing Flow Sessions
/// Shown when user taps mic in keyboard (taik://flow) or from settings
struct FlowSessionView: View {
    @ObservedObject var flowManager = FlowSessionManager.shared
    @Environment(\.dismiss) private var dismiss

    /// If true, auto-enable session on appear (Tier 2 fallback from keyboard)
    let autoEnable: Bool

    @State private var selectedTimeout: TimeInterval = Constants.FlowSession.defaultTimeout
    @State private var showingEndConfirmation = false
    @State private var didAutoEnable = false  // Track if we auto-enabled this appearance

    private let timeoutOptions: [(String, TimeInterval)] = [
        ("5 minutes", 5 * 60),
        ("15 minutes", 15 * 60),
        ("30 minutes", 30 * 60),
        ("1 hour", 60 * 60)
    ]

    init(autoEnable: Bool = false) {
        self.autoEnable = autoEnable
    }

    var body: some View {
        VStack(spacing: 24) {
            if flowManager.isSessionActive {
                activeSessionView
            } else {
                startSessionView
            }
        }
        .padding()
        .onAppear {
            // Tier 2: Auto-enable session when opened from keyboard
            if autoEnable && !flowManager.isSessionActive {
                print("[FlowSessionView] Tier 2: Auto-enabling flow session")
                flowManager.startFlowSession()
                didAutoEnable = true
            }
        }
        .alert("End Flow Session?", isPresented: $showingEndConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("End Session", role: .destructive) {
                flowManager.endFlowSession()
            }
        } message: {
            Text("Voice dictation from the keyboard will require re-enabling.")
        }
    }

    // MARK: - Active Session View

    private var activeSessionView: some View {
        VStack(spacing: 24) {
            Spacer()

            // Status indicator
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.2))
                        .frame(width: 120, height: 120)

                    Circle()
                        .fill(Color.green.opacity(0.3))
                        .frame(width: 90, height: 90)

                    Image(systemName: flowManager.isCapturing ? "waveform" : "checkmark.circle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.green)
                }

                Text(flowManager.isCapturing ? "Listening..." : "Flow Session Active")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Voice dictation is enabled")
                    .foregroundColor(.secondary)
            }

            // Prominent "swipe back" instruction when auto-enabled (Tier 2)
            if didAutoEnable || autoEnable {
                VStack(spacing: 12) {
                    Image(systemName: "arrow.left.circle.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.blue)

                    Text("Swipe back to return to your app")
                        .font(.headline)
                        .multilineTextAlignment(.center)

                    Text("Then tap the mic button to dictate")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }

            // Time remaining
            VStack(spacing: 8) {
                Text("Session Duration")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(flowManager.remainingTimeString)
                    .font(.system(size: 36, weight: .light, design: .monospaced))
                    .foregroundColor(.primary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            Spacer()

            // Instructions (more compact when auto-enabled)
            if !didAutoEnable && !autoEnable {
                VStack(alignment: .leading, spacing: 12) {
                    instructionRow(icon: "hand.tap", text: "Tap mic in keyboard to start/stop recording")
                    instructionRow(icon: "arrow.left", text: "Swipe back to return to your app")
                    instructionRow(icon: "text.bubble", text: "Text appears automatically after speaking")
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }

            // Error display
            if let error = flowManager.lastError {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            Spacer()

            // End session button
            Button {
                showingEndConfirmation = true
            } label: {
                Text("End Flow Session")
                    .font(.headline)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
            }
        }
    }

    // MARK: - Start Session View

    private var startSessionView: some View {
        VStack(spacing: 24) {
            Spacer()

            // Icon
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 120, height: 120)

                    Image(systemName: "mic.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                }

                Text("Enable Flow Session")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Voice dictation without app switching")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Duration picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Session Duration")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Picker("Duration", selection: $selectedTimeout) {
                    ForEach(timeoutOptions, id: \.1) { option in
                        Text(option.0).tag(option.1)
                    }
                }
                .pickerStyle(.segmented)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            // How it works
            VStack(alignment: .leading, spacing: 12) {
                Text("How it works")
                    .font(.headline)

                instructionRow(number: "1", text: "Tap \"Enable\" below")
                instructionRow(number: "2", text: "Swipe back to your app")
                instructionRow(number: "3", text: "Tap mic in keyboard to dictate")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)

            Spacer()

            // Enable button
            Button {
                flowManager.startFlowSession(timeout: selectedTimeout)
            } label: {
                HStack {
                    Image(systemName: "mic.fill")
                    Text("Enable Flow Session")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .cornerRadius(12)
            }

            // Note about returning
            Text("After enabling, swipe back to return to your previous app")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Helper Views

    private func instructionRow(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.blue)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }

    private func instructionRow(number: String, text: String) -> some View {
        HStack(spacing: 12) {
            Text(number)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.blue)
                .clipShape(Circle())

            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

#Preview {
    FlowSessionView()
}

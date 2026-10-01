import SwiftUI
import Speech

/// Settings view for speech engine configuration
/// Extensible design for future engines and API integrations
struct SpeechSettingsView: View {
    @ObservedObject private var flowManager = FlowSessionManager.shared
    @State private var selectedEngine: SpeechEngineId
    @State private var selectedPostProcessor: String = "noop"
    @State private var transcriptStyle: TranscriptStyle
    @State private var showApiKeySheet = false
    @State private var apiKeyInput = ""
    @State private var selectedApiProvider: RemoteApiEngine.Provider?

    // Engine availability
    @State private var onDeviceAvailable = false
    @State private var checkingAvailability = true

    init() {
        _selectedEngine = State(initialValue: FlowSessionManager.shared.engineSelection.preferredId)
        _transcriptStyle = State(initialValue: FlowSessionManager.shared.transcriptStyle)
    }

    var body: some View {
        List {
            // Speech Engine Section
            speechEngineSection

            // Post-Processing Section
            postProcessingSection

            // API Configuration Section (for future cloud services)
            apiConfigurationSection

            // Engine Status Section
            engineStatusSection
        }
        .navigationTitle("Speech Settings")
        .onAppear {
            checkEngineAvailability()
        }
        .sheet(isPresented: $showApiKeySheet) {
            apiKeySheet
        }
    }

    // MARK: - Speech Engine Section

    private var speechEngineSection: some View {
        Section {
            Picker("Speech Engine", selection: $selectedEngine) {
                ForEach(availableEngines, id: \.self) { engineId in
                    HStack {
                        engineIcon(for: engineId)
                        Text(engineId.displayName)
                    }
                    .tag(engineId)
                }
            }
            .onChange(of: selectedEngine) { _, newValue in
                updateEngineSelection(newValue)
            }

            // Engine description
            Text(selectedEngine.description)
                .font(.caption)
                .foregroundColor(.secondary)

        } header: {
            Text("Speech Engine")
        } footer: {
            Text("Select which speech recognition engine to use. On-device is more private and works offline.")
        }
    }

    private var availableEngines: [SpeechEngineId] {
        var engines: [SpeechEngineId] = []

        // Always show Apple engines
        if onDeviceAvailable {
            engines.append(.appleOnDevice)
        }
        engines.append(.appleOnline)

        // Show stubs for future engines (disabled but visible)
        // engines.append(.whisperLocal)
        // engines.append(.remoteApi)

        return engines
    }

    @ViewBuilder
    private func engineIcon(for id: SpeechEngineId) -> some View {
        switch id {
        case .appleOnline:
            Image(systemName: "icloud")
                .foregroundColor(.blue)
        case .appleOnDevice:
            Image(systemName: "iphone")
                .foregroundColor(.green)
        case .whisperLocal:
            Image(systemName: "cpu")
                .foregroundColor(.purple)
        case .remoteApi:
            Image(systemName: "antenna.radiowaves.left.and.right")
                .foregroundColor(.orange)
        case .appleSpeechAnalyzerMac:
            Image(systemName: "desktopcomputer")
                .foregroundColor(.gray)
        }
    }

    // MARK: - Post-Processing Section

    private var postProcessingSection: some View {
        Section {
            Picker("Text Cleanup", selection: $transcriptStyle) {
                ForEach(TranscriptStyle.allCases, id: \.self) { style in
                    Text(style.displayName)
                        .tag(style)
                }
            }
            .onChange(of: transcriptStyle) { _, newValue in
                flowManager.transcriptStyle = newValue
            }

            Text(transcriptStyle.description)
                .font(.caption)
                .foregroundColor(.secondary)

        } header: {
            Text("Post-Processing")
        } footer: {
            Text("How to clean up transcribed text. Future updates will add AI-powered cleanup options.")
        }
    }

    // MARK: - API Configuration Section

    private var apiConfigurationSection: some View {
        Section {
            // Placeholder for future API integrations
            NavigationLink {
                FutureApiSettingsView()
            } label: {
                HStack {
                    Image(systemName: "key.fill")
                        .foregroundColor(.orange)
                    Text("API Keys")
                    Spacer()
                    Text("Not configured")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
            }

            NavigationLink {
                FutureEnginesView()
            } label: {
                HStack {
                    Image(systemName: "plus.circle")
                        .foregroundColor(.blue)
                    Text("Add Speech Engines")
                }
            }

        } header: {
            Text("Cloud Services")
        } footer: {
            Text("Configure API keys for cloud-based speech recognition services like DeepGram, OpenAI Whisper API, and more.")
        }
    }

    // MARK: - Engine Status Section

    private var engineStatusSection: some View {
        Section {
            HStack {
                Text("Current Engine")
                Spacer()
                if checkingAvailability {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Text(selectedEngine.displayName)
                        .foregroundColor(.secondary)
                }
            }

            HStack {
                Text("On-Device Available")
                Spacer()
                Image(systemName: onDeviceAvailable ? "checkmark.circle.fill" : "xmark.circle")
                    .foregroundColor(onDeviceAvailable ? .green : .red)
            }

            HStack {
                Text("Speech Authorization")
                Spacer()
                Text(authorizationStatusText)
                    .foregroundColor(authorizationStatusColor)
            }

        } header: {
            Text("Status")
        }
    }

    private var authorizationStatusText: String {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: return "Authorized"
        case .denied: return "Denied"
        case .restricted: return "Restricted"
        case .notDetermined: return "Not Asked"
        @unknown default: return "Unknown"
        }
    }

    private var authorizationStatusColor: Color {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: return .green
        case .denied, .restricted: return .red
        case .notDetermined: return .orange
        @unknown default: return .gray
        }
    }

    // MARK: - API Key Sheet

    private var apiKeySheet: some View {
        NavigationStack {
            Form {
                if let provider = selectedApiProvider {
                    Section {
                        TextField("API Key", text: $apiKeyInput)
                            .textContentType(.password)
                            .autocapitalization(.none)
                    } header: {
                        Text("\(provider.displayName) API Key")
                    }
                }
            }
            .navigationTitle("Configure API")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showApiKeySheet = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveApiKey()
                        showApiKeySheet = false
                    }
                    .disabled(apiKeyInput.isEmpty)
                }
            }
        }
    }

    // MARK: - Actions

    private func checkEngineAvailability() {
        checkingAvailability = true

        Task {
            // Check on-device availability
            let onDevice = AppleSpeechEngine.isOnDeviceAvailable()

            await MainActor.run {
                onDeviceAvailable = onDevice
                checkingAvailability = false

                // If on-device not available and that's selected, fall back to online
                if !onDevice && selectedEngine == .appleOnDevice {
                    selectedEngine = .appleOnline
                    updateEngineSelection(.appleOnline)
                }
            }
        }
    }

    private func updateEngineSelection(_ engineId: SpeechEngineId) {
        let selection = SpeechEngineSelection(
            preferredId: engineId,
            fallbackOrder: engineId == .appleOnDevice ? [.appleOnline] : [.appleOnDevice]
        )
        flowManager.engineSelection = selection
    }

    private func saveApiKey() {
        // TODO: Save API key securely (Keychain)
        // For now, this is a placeholder
    }
}

// MARK: - Future API Settings View

struct FutureApiSettingsView: View {
    var body: some View {
        List {
            Section {
                apiProviderRow(name: "DeepGram", icon: "waveform", configured: false)
                apiProviderRow(name: "OpenAI Whisper", icon: "brain", configured: false)
                apiProviderRow(name: "Google Cloud", icon: "globe", configured: false)
                apiProviderRow(name: "Azure Speech", icon: "cloud", configured: false)
            } header: {
                Text("Available Providers")
            } footer: {
                Text("Tap a provider to configure its API key. These services require an account and may incur usage costs.")
            }
        }
        .navigationTitle("API Keys")
    }

    private func apiProviderRow(name: String, icon: String, configured: Bool) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)

            Text(name)

            Spacer()

            if configured {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else {
                Text("Not configured")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Future Engines View

struct FutureEnginesView: View {
    var body: some View {
        List {
            Section {
                futureEngineRow(
                    name: "WhisperKit (Local)",
                    description: "Run OpenAI Whisper on-device for maximum privacy",
                    icon: "cpu",
                    status: "Coming Soon"
                )

                futureEngineRow(
                    name: "DeepGram",
                    description: "Fast, accurate cloud transcription",
                    icon: "bolt.fill",
                    status: "Coming Soon"
                )

                futureEngineRow(
                    name: "OpenAI Whisper API",
                    description: "OpenAI's cloud Whisper service",
                    icon: "brain",
                    status: "Coming Soon"
                )

            } header: {
                Text("Additional Engines")
            } footer: {
                Text("These engines will be available in future updates. Each has different trade-offs for speed, accuracy, privacy, and cost.")
            }

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    comparisonRow(label: "Privacy", onDevice: "Best", cloud: "Data sent to servers")
                    comparisonRow(label: "Offline", onDevice: "Yes", cloud: "No")
                    comparisonRow(label: "Accuracy", onDevice: "Good", cloud: "Best")
                    comparisonRow(label: "Speed", onDevice: "Fast", cloud: "Varies")
                    comparisonRow(label: "Cost", onDevice: "Free", cloud: "Pay per use")
                }
                .font(.caption)
                .padding(.vertical, 8)
            } header: {
                Text("On-Device vs Cloud")
            }
        }
        .navigationTitle("Add Engines")
    }

    private func futureEngineRow(name: String, description: String, icon: String, status: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.purple)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text(status)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.orange.opacity(0.2))
                .foregroundColor(.orange)
                .cornerRadius(4)
        }
    }

    private func comparisonRow(label: String, onDevice: String, cloud: String) -> some View {
        HStack {
            Text(label)
                .frame(width: 70, alignment: .leading)
                .foregroundColor(.secondary)

            Text(onDevice)
                .frame(maxWidth: .infinity)
                .foregroundColor(.green)

            Text(cloud)
                .frame(maxWidth: .infinity)
                .foregroundColor(.blue)
        }
    }
}

#Preview {
    NavigationStack {
        SpeechSettingsView()
    }
}

import SwiftUI
import Speech

struct ModelSetupView: View {
    @EnvironmentObject var appState: AppState
    @State private var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
    @State private var isRequestingPermission = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.accentColor)

            VStack(spacing: 8) {
                Text("Welcome to Taik")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("On-device speech recognition")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(spacing: 16) {
                switch authorizationStatus {
                case .notDetermined:
                    requestPermissionView
                case .authorized:
                    authorizedView
                case .denied, .restricted:
                    deniedView
                @unknown default:
                    requestPermissionView
                }
            }
            .padding(.horizontal, 32)

            Spacer()

            Text("Audio is processed using Apple's Speech Recognition.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
                .padding(.bottom)
        }
        .onAppear {
            authorizationStatus = SFSpeechRecognizer.authorizationStatus()
            if authorizationStatus == .authorized {
                appState.modelStatus = .ready
            }
        }
        .alert("Permission Error", isPresented: $showError) {
            Button("OK") {}
            Button("Open Settings") { openSettings() }
        } message: {
            Text(errorMessage)
        }
    }

    private var requestPermissionView: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("Speech Recognition")
                    .font(.headline)
                Text("Taik needs permission to recognize speech")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: requestPermission) {
                HStack {
                    if isRequestingPermission {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                    }
                    Text("Enable Speech Recognition")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isRequestingPermission)
        }
    }

    private var authorizedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)

            Text("Ready to use!")
                .font(.headline)

            Text("Speech recognition is enabled")
                .font(.caption)
                .foregroundColor(.secondary)

            Button(action: { appState.modelStatus = .ready }) {
                Text("Get Started")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
    }

    private var deniedView: some View {
        VStack(spacing: 16) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.red)

            Text("Permission Required")
                .font(.headline)

            Text("Please enable Speech Recognition in Settings to use Taik.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button(action: openSettings) {
                HStack {
                    Image(systemName: "gear")
                    Text("Open Settings")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
    }

    private func requestPermission() {
        isRequestingPermission = true

        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                isRequestingPermission = false
                authorizationStatus = status

                switch status {
                case .authorized:
                    appState.modelStatus = .ready
                case .denied:
                    errorMessage = "Speech recognition permission was denied."
                    showError = true
                case .restricted:
                    errorMessage = "Speech recognition is restricted on this device."
                    showError = true
                case .notDetermined:
                    break
                @unknown default:
                    break
                }
            }
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    ModelSetupView()
        .environmentObject(AppState())
}

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0

    var body: some View {
        Group {
            if appState.modelStatus == .missing || appState.modelStatus == .downloading {
                ModelSetupView()
            } else {
                mainContent
            }
        }
        .sheet(isPresented: $appState.showRecordingView) {
            NavigationStack {
                RecordingView()
                    .environmentObject(appState)
            }
        }
        .fullScreenCover(isPresented: $appState.showFlowSession) {
            NavigationStack {
                FlowSessionView(autoEnable: appState.shouldAutoEnableFlowSession)
                    .navigationTitle("Flow Session")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Done") {
                                appState.showFlowSession = false
                                appState.shouldAutoEnableFlowSession = false
                            }
                        }
                    }
            }
        }
    }

    private var mainContent: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                RecordingView()
            }
            .tabItem {
                Label("Record", systemImage: "mic.fill")
            }
            .tag(0)

            NavigationStack {
                DeckEditorView()
            }
            .tabItem {
                Label("Deck", systemImage: "square.grid.2x2.fill")
            }
            .tag(1)

            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
            .tag(2)
        }
        .onAppear {
            if appState.showDeckEditor {
                selectedTab = 1
                appState.showDeckEditor = false
            }
        }
    }
}

struct SettingsView: View {
    @ObservedObject private var flowManager = FlowSessionManager.shared

    var body: some View {
        List {
            Section("Flow Session") {
                if flowManager.isSessionActive {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Active")
                        Spacer()
                        Text(flowManager.remainingTimeString)
                            .foregroundColor(.secondary)
                            .font(.system(.body, design: .monospaced))
                    }

                    Button("End Flow Session", role: .destructive) {
                        flowManager.endFlowSession()
                    }
                } else {
                    HStack {
                        Image(systemName: "xmark.circle")
                            .foregroundColor(.secondary)
                        Text("Not active")
                        Spacer()
                    }

                    NavigationLink {
                        FlowSessionView()
                            .navigationTitle("Flow Session")
                    } label: {
                        Text("Start Flow Session")
                    }
                }
            }

            Section("Speech Recognition") {
                NavigationLink {
                    SpeechSettingsView()
                } label: {
                    HStack {
                        Image(systemName: "waveform")
                            .foregroundColor(.blue)
                        Text("Speech Engine")
                        Spacer()
                        Text(flowManager.engineSelection.preferredId.displayName)
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
            }

            Section("Keyboard Setup") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Enable Taik Keyboard")
                        .font(.headline)
                    Text("1. Open Settings > General > Keyboard")
                    Text("2. Tap 'Keyboards' > 'Add New Keyboard'")
                    Text("3. Select 'Taik'")
                    Text("4. Tap 'Taik' > Enable 'Allow Full Access'")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.vertical, 8)

                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            }

            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}

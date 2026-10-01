//
//  TaikApp.swift
//  Taik
//
//  Created by Bo An on 12/6/25.
//

import SwiftUI

@main
struct TaikApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .onOpenURL { url in
                    handleURL(url)
                }
        }
    }

    private func handleURL(_ url: URL) {
        guard url.scheme == "taik" else { return }

        switch url.host {
        case "record":
            appState.showRecordingView = true
            appState.shouldAutoStartRecording = true
        case "deck":
            appState.showDeckEditor = true
        case "flow":
            appState.shouldAutoEnableFlowSession = true  // Tier 2: auto-enable on appear
            appState.showFlowSession = true
        default:
            break
        }
    }
}

/// Global app state shared across views
class AppState: ObservableObject {
    @Published var showRecordingView = false
    @Published var showDeckEditor = false
    @Published var showFlowSession = false
    @Published var shouldAutoStartRecording = false
    @Published var shouldAutoEnableFlowSession = false  // Tier 2: auto-enable when opened from keyboard
    @Published var modelStatus: ModelStatus = .missing

    init() {
        modelStatus = SharedStorage.shared.modelInfo.status
    }
}

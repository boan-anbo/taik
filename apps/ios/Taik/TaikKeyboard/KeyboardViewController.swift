//
//  KeyboardViewController.swift
//  TaikKeyboard
//
//  Created by Bo An on 12/6/25.
//

import UIKit
import SwiftUI

class KeyboardViewController: UIInputViewController {

    // MARK: - Properties

    private var hostingController: UIHostingController<AnyView>?
    private var keyboardMode: KeyboardMode = .strip
    private var buttons: [DeckButton] = []
    private var transcriptionObserver: Timer?
    private var micState: MicButtonState = .inactive
    private var flowStateObserver: Timer?
    private var processingStartTime: Date?
    private var pendingCommand: String? // Track pending command waiting for ack
    private var pendingCommandTime: Date? // When we sent the pending command
    private var tier1RequestTime: Date? // Tier 1: When we requested background enable

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        loadButtons()
        updateMicState()
        setupKeyboardView()
        startTranscriptionPolling()
        startFlowStatePolling()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadButtons()
        updateMicState()
        checkPendingTranscription()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        stopTranscriptionPolling()
        stopFlowStatePolling()
    }

    override func updateViewConstraints() {
        super.updateViewConstraints()
        updateKeyboardHeight()
    }

    // MARK: - Setup

    private func setupKeyboardView() {
        let keyboardView = makeKeyboardView()
        let hostingController = UIHostingController(rootView: AnyView(keyboardView))
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        hostingController.view.backgroundColor = .clear

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.didMove(toParent: self)

        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        self.hostingController = hostingController
    }

    private func makeKeyboardView() -> some View {
        KeyboardViewWrapper(
            mode: Binding(
                get: { self.keyboardMode },
                set: { newMode in
                    self.keyboardMode = newMode
                    self.updateKeyboardHeight()
                    self.refreshKeyboardView()
                }
            ),
            buttons: buttons,
            onButtonTap: { [weak self] button in
                self?.executeAction(button.action)
            },
            onMicTap: { [weak self] in
                self?.handleMicTap()
            },
            onAddTap: { [weak self] in
                self?.openMainAppForDeckEditor()
            },
            onNextKeyboard: { [weak self] in
                self?.advanceToNextInputMode()
            },
            showNextKeyboard: needsInputModeSwitchKey,
            micState: micState
        )
    }

    private func refreshKeyboardView() {
        hostingController?.rootView = AnyView(makeKeyboardView())
    }

    // MARK: - Height Management

    private func updateKeyboardHeight() {
        let height: CGFloat = keyboardMode == .deck ? 264 : 48

        // Remove existing height constraints
        view.constraints.forEach { constraint in
            if constraint.firstAttribute == .height {
                view.removeConstraint(constraint)
            }
        }

        let heightConstraint = view.heightAnchor.constraint(equalToConstant: height)
        heightConstraint.priority = .required
        heightConstraint.isActive = true
    }

    // MARK: - Button Loading

    private func loadButtons() {
        buttons = SharedStorage.shared.buttons
        refreshKeyboardView()
    }

    // MARK: - Action Execution

    private func executeAction(_ action: ButtonAction) {
        switch action {
        case .insertText(let text):
            textDocumentProxy.insertText(text)
        }
    }

    // MARK: - Main App Communication

    private func openMainAppForRecording() {
        guard let url = URL(string: Constants.URLScheme.record) else { return }
        openURL(url)
    }

    private func openMainAppForDeckEditor() {
        guard let url = URL(string: Constants.URLScheme.deck) else { return }
        openURL(url)
    }

    private func openMainAppForFlowSession() {
        guard let url = URL(string: Constants.URLScheme.flow) else { return }
        openURL(url)
    }

    private func openURL(_ url: URL) {
        // Keyboard extensions need to use a workaround to open URLs
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = r.next
        }

        // Alternative method using selector
        let selector = sel_registerName("openURL:")
        var responder2: UIResponder? = self
        while let r = responder2 {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            responder2 = r.next
        }
    }

    // MARK: - Mic Button Handling

    private func handleMicTap() {
        let storage = SharedStorage.shared

        print("[Keyboard] Mic tapped - flowSessionActive: \(storage.flowSessionActive), isExpired: \(storage.isFlowSessionExpired), isCapturing: \(storage.isCapturing)")

        // Check if Flow Session is active and not expired
        if storage.flowSessionActive && !storage.isFlowSessionExpired {
            // Toggle capture via App Group
            if storage.isCapturing || pendingCommand == "startCapture" {
                // Stop capture
                storage.flowCommand = "stopCapture"
                pendingCommand = "stopCapture"
                pendingCommandTime = Date()
                micState = .processing
                processingStartTime = Date()
                print("[Keyboard] Sent stopCapture command")
            } else {
                // Start capture
                storage.flowCommand = "startCapture"
                pendingCommand = "startCapture"
                pendingCommandTime = Date()
                micState = .listening
                print("[Keyboard] Sent startCapture command")
            }
            storage.synchronize() // Force sync to App Group
            refreshKeyboardView()
        } else {
            // No active session or expired - try Tier 1 background enable first
            tryBackgroundEnable()
        }
    }

    /// Tier 1: Try to enable Flow Session via background request (no app switch)
    private func tryBackgroundEnable() {
        let storage = SharedStorage.shared

        print("[Keyboard] Tier 1: Attempting background enable")

        // Set the request flag for main app to detect
        storage.requestFlowSession = true
        storage.requestFlowSessionAt = Date()
        storage.synchronize()

        // Show enabling state
        micState = .enabling
        tier1RequestTime = Date()
        refreshKeyboardView()

        print("[Keyboard] Tier 1: Request sent, waiting for main app response...")
    }

    /// Tier 2: Fall back to opening main app (when Tier 1 fails)
    private func fallbackToTier2() {
        let storage = SharedStorage.shared

        print("[Keyboard] Tier 2: Falling back to opening main app")

        // Clear the request flag
        storage.requestFlowSession = false
        storage.synchronize()

        // Reset state and open main app
        tier1RequestTime = nil
        micState = .inactive
        refreshKeyboardView()

        openMainAppForFlowSession()
    }

    private func updateMicState() {
        let storage = SharedStorage.shared

        if !storage.flowSessionActive || storage.isFlowSessionExpired {
            micState = .inactive
            pendingCommand = nil
        } else if storage.isCapturing {
            // Main app confirmed it's capturing
            micState = .listening
            if pendingCommand == "startCapture" {
                print("[Keyboard] startCapture acknowledged by main app")
                pendingCommand = nil // Command acknowledged
                pendingCommandTime = nil
            }
        } else if processingStartTime != nil {
            micState = .processing
        } else if pendingCommand == "startCapture" {
            // We sent startCapture, waiting for main app to acknowledge
            micState = .listening
        } else {
            micState = .ready
            pendingCommand = nil
        }
    }

    // MARK: - Flow State Polling

    private func startFlowStatePolling() {
        flowStateObserver = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            self?.checkFlowState()
        }
    }

    private func stopFlowStatePolling() {
        flowStateObserver?.invalidate()
        flowStateObserver = nil
    }

    private func checkFlowState() {
        let oldState = micState
        let storage = SharedStorage.shared
        // Debug: log current state periodically (every ~5s to avoid spam)
        if Int(Date().timeIntervalSince1970) % 5 == 0 {
            print("[Keyboard] Poll - active: \(storage.flowSessionActive), capturing: \(storage.isCapturing), command: \(storage.flowCommand ?? "nil"), pending: \(pendingCommand ?? "nil"), tier1: \(tier1RequestTime != nil)")
        }

        // Tier 1: Check if background enable succeeded
        if let requestTime = tier1RequestTime {
            if storage.flowSessionActive && !storage.isFlowSessionExpired {
                // Success! Tier 1 worked - main app enabled the session
                print("[Keyboard] Tier 1: Success! Flow session enabled by main app")
                tier1RequestTime = nil
                micState = .ready
                refreshKeyboardView()
                return
            }

            // Check for Tier 1 timeout
            let elapsed = Date().timeIntervalSince(requestTime)
            if elapsed > Constants.FlowSession.tier1Timeout {
                print("[Keyboard] Tier 1: Timeout after \(elapsed)s, falling back to Tier 2")
                fallbackToTier2()
                return
            }
        }

        // Check for pending command timeout (main app not responding)
        if let cmdTime = pendingCommandTime, pendingCommand == "startCapture" {
            let elapsed = Date().timeIntervalSince(cmdTime)
            if elapsed > 3.0 { // 3 second timeout for command acknowledgment
                print("[Keyboard] Command timeout - main app not responding, resetting state")
                pendingCommand = nil
                pendingCommandTime = nil
                // Main app is likely suspended, need to open it
                storage.flowSessionActive = false
                storage.synchronize()
            }
        }

        updateMicState()

        // Check for transcription timeout when processing
        if let startTime = processingStartTime {
            let elapsed = Date().timeIntervalSince(startTime)
            if elapsed > Constants.FlowSession.transcriptionTimeout {
                // Timeout - reset to ready state
                processingStartTime = nil
                pendingCommand = nil
                pendingCommandTime = nil
                micState = .ready
                print("[Keyboard] Transcription timeout")
            }
        }

        // Refresh view if state changed
        if oldState != micState {
            refreshKeyboardView()
        }
    }

    // MARK: - Transcription Polling

    private func startTranscriptionPolling() {
        transcriptionObserver = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkPendingTranscription()
        }
    }

    private func stopTranscriptionPolling() {
        transcriptionObserver?.invalidate()
        transcriptionObserver = nil
    }

    private func checkPendingTranscription() {
        if let transcription = SharedStorage.shared.consumePendingTranscription() {
            textDocumentProxy.insertText(transcription)
            // Reset processing state
            processingStartTime = nil
            updateMicState()
            refreshKeyboardView()
        }
    }

    // MARK: - Text Input Delegate

    override func textWillChange(_ textInput: UITextInput?) {
        // Called before text changes
    }

    override func textDidChange(_ textInput: UITextInput?) {
        // Called after text changes
    }
}

// MARK: - SwiftUI Wrapper

/// Wrapper to handle bindings properly in keyboard context
private struct KeyboardViewWrapper: View {
    @Binding var mode: KeyboardMode
    let buttons: [DeckButton]
    let onButtonTap: (DeckButton) -> Void
    let onMicTap: () -> Void
    let onAddTap: () -> Void
    let onNextKeyboard: () -> Void
    let showNextKeyboard: Bool
    let micState: MicButtonState

    var body: some View {
        KeyboardView(
            mode: $mode,
            buttons: buttons,
            onButtonTap: onButtonTap,
            onMicTap: onMicTap,
            onAddTap: onAddTap,
            onNextKeyboard: onNextKeyboard,
            showNextKeyboard: showNextKeyboard,
            micState: micState
        )
    }
}

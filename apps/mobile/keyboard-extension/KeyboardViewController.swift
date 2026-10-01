/**
 * TaikKeyboard Extension
 * Custom iOS keyboard that can insert transcribed text from the main app
 * Uses App Groups for IPC with the main app
 */

import UIKit

class KeyboardViewController: UIInputViewController {

  // MARK: - Properties

  private let appGroupIdentifier = "group.app.carrel.taik"

  // UI Components
  private var mainStackView: UIStackView!
  private var transcriptionButton: UIButton!
  private var statusLabel: UILabel!
  private var keyboardStackView: UIStackView!

  // State
  private var hasPendingTranscription = false
  private var pendingText: String?

  // MARK: - Lifecycle

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()
    checkForPendingTranscription()
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    checkForPendingTranscription()
  }

  // MARK: - UI Setup

  private func setupUI() {
    // Main container
    mainStackView = UIStackView()
    mainStackView.axis = .vertical
    mainStackView.spacing = 8
    mainStackView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(mainStackView)

    NSLayoutConstraint.activate([
      mainStackView.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
      mainStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
      mainStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
      mainStackView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8)
    ])

    // Transcription insert button
    setupTranscriptionButton()

    // Status label
    setupStatusLabel()

    // Basic keyboard row
    setupKeyboardRow()

    // Next keyboard button (required for third-party keyboards)
    setupNextKeyboardButton()
  }

  private func setupTranscriptionButton() {
    transcriptionButton = UIButton(type: .system)
    transcriptionButton.setTitle("Insert Transcription", for: .normal)
    transcriptionButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
    transcriptionButton.backgroundColor = UIColor.systemBlue
    transcriptionButton.setTitleColor(.white, for: .normal)
    transcriptionButton.layer.cornerRadius = 8
    transcriptionButton.heightAnchor.constraint(equalToConstant: 44).isActive = true
    transcriptionButton.addTarget(self, action: #selector(insertTranscription), for: .touchUpInside)
    transcriptionButton.isHidden = true

    mainStackView.addArrangedSubview(transcriptionButton)
  }

  private func setupStatusLabel() {
    statusLabel = UILabel()
    statusLabel.text = "No pending transcription"
    statusLabel.textAlignment = .center
    statusLabel.font = .systemFont(ofSize: 13)
    statusLabel.textColor = .secondaryLabel
    statusLabel.numberOfLines = 2

    mainStackView.addArrangedSubview(statusLabel)
  }

  private func setupKeyboardRow() {
    keyboardStackView = UIStackView()
    keyboardStackView.axis = .horizontal
    keyboardStackView.distribution = .fillEqually
    keyboardStackView.spacing = 4

    // Add some basic utility buttons
    let spaceButton = createKeyButton(title: "Space", action: #selector(insertSpace))
    let deleteButton = createKeyButton(title: "⌫", action: #selector(deleteBackward))
    let returnButton = createKeyButton(title: "Return", action: #selector(insertReturn))

    keyboardStackView.addArrangedSubview(deleteButton)
    keyboardStackView.addArrangedSubview(spaceButton)
    keyboardStackView.addArrangedSubview(returnButton)

    mainStackView.addArrangedSubview(keyboardStackView)
  }

  private func setupNextKeyboardButton() {
    let nextKeyboardButton = UIButton(type: .system)
    nextKeyboardButton.setTitle("🌐 Switch Keyboard", for: .normal)
    nextKeyboardButton.titleLabel?.font = .systemFont(ofSize: 14)
    nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
    nextKeyboardButton.heightAnchor.constraint(equalToConstant: 36).isActive = true

    mainStackView.addArrangedSubview(nextKeyboardButton)
  }

  private func createKeyButton(title: String, action: Selector) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.titleLabel?.font = .systemFont(ofSize: 15)
    button.backgroundColor = UIColor.systemGray5
    button.layer.cornerRadius = 6
    button.heightAnchor.constraint(equalToConstant: 40).isActive = true
    button.addTarget(self, action: action, for: .touchUpInside)
    return button
  }

  // MARK: - App Groups Storage

  private func checkForPendingTranscription() {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      updateStatus(text: "App Group not available", hasTranscription: false)
      return
    }

    guard let text = defaults.string(forKey: "pendingTranscription") else {
      updateStatus(text: "No pending transcription", hasTranscription: false)
      return
    }

    let consumed = defaults.bool(forKey: "pendingConsumed")
    if consumed {
      updateStatus(text: "Transcription already inserted", hasTranscription: false)
      return
    }

    // We have a pending transcription
    pendingText = text
    hasPendingTranscription = true

    // Truncate for display
    let displayText = text.count > 50 ? String(text.prefix(50)) + "..." : text
    updateStatus(text: "Ready to insert: \"\(displayText)\"", hasTranscription: true)
  }

  private func updateStatus(text: String, hasTranscription: Bool) {
    statusLabel.text = text
    transcriptionButton.isHidden = !hasTranscription

    if hasTranscription {
      statusLabel.textColor = .systemBlue
      transcriptionButton.setTitle("📝 Insert Transcription", for: .normal)
    } else {
      statusLabel.textColor = .secondaryLabel
    }
  }

  private func markTranscriptionConsumed() {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else { return }
    defaults.set(true, forKey: "pendingConsumed")
    defaults.synchronize()
  }

  // MARK: - Actions

  @objc private func insertTranscription() {
    guard let text = pendingText else { return }

    // Insert the text
    textDocumentProxy.insertText(text)

    // Mark as consumed
    markTranscriptionConsumed()

    // Update UI
    pendingText = nil
    hasPendingTranscription = false
    updateStatus(text: "Transcription inserted ✓", hasTranscription: false)

    // Brief feedback
    UIView.animate(withDuration: 0.2) {
      self.statusLabel.textColor = .systemGreen
    }
  }

  @objc private func insertSpace() {
    textDocumentProxy.insertText(" ")
  }

  @objc private func deleteBackward() {
    textDocumentProxy.deleteBackward()
  }

  @objc private func insertReturn() {
    textDocumentProxy.insertText("\n")
  }
}

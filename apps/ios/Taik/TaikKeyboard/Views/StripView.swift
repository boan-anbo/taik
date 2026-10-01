import SwiftUI

/// Mic button state for keyboard UI
enum MicButtonState {
    case inactive      // No flow session - tap to enable
    case enabling      // Tier 1: Waiting for background enable (spinner)
    case ready         // Flow session active - tap to speak
    case listening     // Currently recording
    case processing    // Transcribing
}

/// Compact strip mode view - horizontal bar with buttons above system keyboard
struct StripView: View {
    let buttons: [DeckButton]
    let onButtonTap: (DeckButton) -> Void
    let onDeckTap: () -> Void
    let onMicTap: () -> Void
    let onNextKeyboard: () -> Void
    let showNextKeyboard: Bool
    let micState: MicButtonState

    var body: some View {
        HStack(spacing: 8) {
            // Next keyboard button (globe)
            if showNextKeyboard {
                NextKeyboardButton(action: onNextKeyboard)
            }

            // Scrollable button strip
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(stripButtons) { button in
                        StripButtonView(button: button) {
                            onButtonTap(button)
                        }
                    }
                }
            }

            Spacer()

            // Deck toggle button
            Button(action: onDeckTap) {
                Image(systemName: "square.grid.2x2")
                    .font(.title3)
                    .frame(width: 36, height: 36)
                    .background(Color(.systemGray5))
                    .cornerRadius(8)
            }
            .buttonStyle(.plain)

            // Mic button with state
            MicButton(state: micState, action: onMicTap)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .frame(height: 48)
        .background(Color(.systemGray6))
    }

    private var stripButtons: [DeckButton] {
        buttons.filter { $0.showInStrip }.sorted { $0.order < $1.order }
    }
}

/// Mic button with different visual states
struct MicButton: View {
    let state: MicButtonState
    let action: () -> Void

    @State private var isPulsing = false

    var body: some View {
        Button(action: action) {
            ZStack {
                // Background
                RoundedRectangle(cornerRadius: 8)
                    .fill(backgroundColor)
                    .frame(width: 36, height: 36)

                // Pulsing effect for listening state
                if state == .listening {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.red.opacity(0.3))
                        .frame(width: 36, height: 36)
                        .scaleEffect(isPulsing ? 1.2 : 1.0)
                        .opacity(isPulsing ? 0 : 0.5)
                }

                // Icon
                Group {
                    switch state {
                    case .inactive:
                        Image(systemName: "mic.fill")
                    case .enabling:
                        ProgressView()
                            .scaleEffect(0.7)
                            .tint(.white)
                    case .ready:
                        Image(systemName: "mic.fill")
                    case .listening:
                        Image(systemName: "waveform")
                    case .processing:
                        ProgressView()
                            .scaleEffect(0.7)
                            .tint(.white)
                    }
                }
                .font(.title3)
                .foregroundColor(iconColor)
            }
        }
        .buttonStyle(.plain)
        .disabled(state == .processing || state == .enabling)
        .onAppear {
            if state == .listening {
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
        }
        .onChange(of: state) { _, newState in
            if newState == .listening {
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            } else {
                isPulsing = false
            }
        }
    }

    private var backgroundColor: Color {
        switch state {
        case .inactive:
            return Color(.systemGray4)
        case .enabling:
            return Color.accentColor.opacity(0.7)
        case .ready:
            return Color.accentColor
        case .listening:
            return Color.red
        case .processing:
            return Color.orange
        }
    }

    private var iconColor: Color {
        switch state {
        case .inactive:
            return .secondary
        default:
            return .white
        }
    }
}

/// Globe button for switching keyboards
struct NextKeyboardButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "globe")
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(Color(.systemGray5))
                .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

import SwiftUI

/// Full deck grid mode - replaces keyboard with button grid
struct DeckGridView: View {
    let buttons: [DeckButton]
    let onButtonTap: (DeckButton) -> Void
    let onKeyboardTap: () -> Void
    let onMicTap: () -> Void
    let onAddTap: () -> Void
    let onNextKeyboard: () -> Void
    let showNextKeyboard: Bool
    let micState: MicButtonState

    private let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Top bar with toggle and mic
            topBar

            // Button grid
            ScrollView {
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(sortedButtons) { button in
                        DeckButtonView(button: button, isCompact: false) {
                            onButtonTap(button)
                        }
                        .frame(height: 60)
                    }

                    // Add button
                    AddButtonView(action: onAddTap)
                        .frame(height: 60)
                }
                .padding(8)
            }
        }
        .background(Color(.systemGray6))
    }

    private var topBar: some View {
        HStack(spacing: 8) {
            // Next keyboard button (globe)
            if showNextKeyboard {
                NextKeyboardButton(action: onNextKeyboard)
            }

            Spacer()

            // Keyboard toggle button (return to strip)
            Button(action: onKeyboardTap) {
                Image(systemName: "keyboard")
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
    }

    private var sortedButtons: [DeckButton] {
        buttons.sorted { $0.order < $1.order }
    }
}

/// Add new button placeholder
struct AddButtonView: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: "plus")
                    .font(.title2)
                Text("Add")
                    .font(.caption)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(8)
            .background(Color(.systemGray5).opacity(0.5))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [5]))
                    .foregroundColor(.secondary)
            )
        }
        .buttonStyle(.plain)
    }
}

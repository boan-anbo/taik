import SwiftUI

/// Keyboard display mode
enum KeyboardMode {
    case strip  // Compact bar above system keyboard
    case deck   // Full button grid
}

/// Main keyboard SwiftUI view - manages mode switching
struct KeyboardView: View {
    @Binding var mode: KeyboardMode
    let buttons: [DeckButton]
    let onButtonTap: (DeckButton) -> Void
    let onMicTap: () -> Void
    let onAddTap: () -> Void
    let onNextKeyboard: () -> Void
    let showNextKeyboard: Bool
    let micState: MicButtonState

    var body: some View {
        VStack(spacing: 0) {
            switch mode {
            case .strip:
                StripView(
                    buttons: buttons,
                    onButtonTap: onButtonTap,
                    onDeckTap: { mode = .deck },
                    onMicTap: onMicTap,
                    onNextKeyboard: onNextKeyboard,
                    showNextKeyboard: showNextKeyboard,
                    micState: micState
                )

            case .deck:
                DeckGridView(
                    buttons: buttons,
                    onButtonTap: onButtonTap,
                    onKeyboardTap: { mode = .strip },
                    onMicTap: onMicTap,
                    onAddTap: onAddTap,
                    onNextKeyboard: onNextKeyboard,
                    showNextKeyboard: showNextKeyboard,
                    micState: micState
                )
                .frame(height: 216) // Standard keyboard height
            }
        }
    }
}

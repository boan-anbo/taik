import SwiftUI

/// Individual deck button component used in both Strip and Deck modes
struct DeckButtonView: View {
    let button: DeckButton
    let isCompact: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: isCompact ? 2 : 4) {
                if let iconName = button.icon {
                    Image(systemName: iconName)
                        .font(isCompact ? .body : .title2)
                }
                Text(button.label)
                    .font(isCompact ? .caption2 : .caption)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(isCompact ? 4 : 8)
            .background(Color(.systemGray5))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

/// Compact button for strip mode
struct StripButtonView: View {
    let button: DeckButton
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let iconName = button.icon {
                    Image(systemName: iconName)
                        .font(.caption)
                }
                Text(button.label)
                    .font(.caption)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(.systemGray5))
            .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}

import SwiftUI

struct DeckEditorView: View {
    @State private var buttons: [DeckButton] = SharedStorage.shared.buttons
    @State private var editingButton: DeckButton?
    @State private var showAddSheet = false
    @State private var isEditing = false

    private let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Strip preview
                    stripPreview

                    Divider()
                        .padding(.vertical)

                    // All buttons grid
                    Text("All Buttons")
                        .font(.headline)
                        .padding(.horizontal)

                    buttonGrid
                }
                .padding()
            }
            .navigationTitle("Deck Editor")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    EditButton()
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showAddSheet = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .environment(\.editMode, .constant(isEditing ? .active : .inactive))
            .sheet(item: $editingButton) { button in
                ButtonEditorSheet(button: button, isNew: false) { updatedButton in
                    if let updated = updatedButton {
                        SharedStorage.shared.updateButton(updated)
                        refreshButtons()
                    }
                }
            }
            .sheet(isPresented: $showAddSheet) {
                ButtonEditorSheet(button: DeckButton(label: "", action: .insertText("")), isNew: true) { newButton in
                    if let button = newButton {
                        SharedStorage.shared.addButton(button)
                        refreshButtons()
                    }
                }
            }
            .onAppear {
                refreshButtons()
            }
        }
    }

    private var stripPreview: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Strip Preview")
                .font(.headline)

            Text("Buttons shown in the compact keyboard strip")
                .font(.caption)
                .foregroundColor(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(buttons.filter { $0.showInStrip }) { button in
                        stripButtonPreview(button)
                    }

                    if buttons.filter({ $0.showInStrip }).isEmpty {
                        Text("No buttons in strip")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }
            }
        }
    }

    private func stripButtonPreview(_ button: DeckButton) -> some View {
        HStack(spacing: 4) {
            if let icon = button.icon {
                Image(systemName: icon)
                    .font(.caption)
            }
            Text(button.label)
                .font(.caption)
                .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.accentColor.opacity(0.2))
        .foregroundColor(.accentColor)
        .cornerRadius(8)
    }

    private var buttonGrid: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(buttons) { button in
                buttonCell(button)
                    .onTapGesture {
                        editingButton = button
                    }
            }
        }
        .padding(.horizontal)
    }

    private func buttonCell(_ button: DeckButton) -> some View {
        VStack(spacing: 8) {
            if let icon = button.icon {
                Image(systemName: icon)
                    .font(.title2)
            }
            Text(button.label)
                .font(.caption)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            if button.showInStrip {
                Image(systemName: "pin.fill")
                    .font(.caption2)
                    .foregroundColor(.accentColor)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 80)
        .padding(8)
        .background(Color(.systemGray6))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(button.showInStrip ? Color.accentColor : Color.clear, lineWidth: 2)
        )
    }

    private func refreshButtons() {
        buttons = SharedStorage.shared.buttons
    }
}

struct ButtonEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var button: DeckButton
    let isNew: Bool
    let onSave: (DeckButton?) -> Void

    @State private var label: String = ""
    @State private var icon: String = ""
    @State private var textToInsert: String = ""
    @State private var showInStrip: Bool = false

    var body: some View {
        NavigationView {
            Form {
                Section("Button Appearance") {
                    TextField("Label", text: $label)

                    HStack {
                        TextField("SF Symbol (optional)", text: $icon)
                        if !icon.isEmpty {
                            Image(systemName: icon)
                                .foregroundColor(.accentColor)
                        }
                    }

                    Toggle("Show in Strip", isOn: $showInStrip)
                }

                Section("Action") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Text to Insert")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        TextEditor(text: $textToInsert)
                            .frame(minHeight: 100)
                    }
                }

                if !isNew {
                    Section {
                        Button("Delete Button", role: .destructive) {
                            SharedStorage.shared.deleteButton(id: button.id)
                            onSave(nil)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(isNew ? "Add Button" : "Edit Button")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveButton()
                    }
                    .disabled(label.isEmpty || textToInsert.isEmpty)
                }
            }
            .onAppear {
                label = button.label
                icon = button.icon ?? ""
                showInStrip = button.showInStrip
                if case .insertText(let text) = button.action {
                    textToInsert = text
                }
            }
        }
    }

    private func saveButton() {
        var updated = button
        updated.label = label
        updated.icon = icon.isEmpty ? nil : icon
        updated.action = .insertText(textToInsert)
        updated.showInStrip = showInStrip
        onSave(updated)
        dismiss()
    }
}

#Preview {
    DeckEditorView()
}

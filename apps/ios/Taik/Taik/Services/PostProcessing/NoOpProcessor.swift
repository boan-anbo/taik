import Foundation

/// No-operation post-processor that returns text unchanged
/// This is the default processor when no LLM enhancement is needed
final class NoOpProcessor: TranscriptPostProcessor {
    let id = "noop"
    let displayName = "None"
    let isAvailable = true
    let requiresNetwork = false

    func process(raw: String, locale: Locale, style: TranscriptStyle) async throws -> String {
        // For raw style, return as-is
        if style == .raw {
            return raw
        }

        // For other styles, do basic cleanup without LLM
        return basicCleanup(raw)
    }

    /// Basic text cleanup without using an LLM
    private func basicCleanup(_ text: String) -> String {
        var result = text

        // Trim whitespace
        result = result.trimmingCharacters(in: .whitespacesAndNewlines)

        // Collapse multiple spaces
        while result.contains("  ") {
            result = result.replacingOccurrences(of: "  ", with: " ")
        }

        // Ensure first letter is capitalized
        if let first = result.first {
            result = first.uppercased() + result.dropFirst()
        }

        // Ensure ends with punctuation
        if !result.isEmpty {
            let lastChar = result.last!
            if ![".", "!", "?", ":", ";"].contains(String(lastChar)) {
                result += "."
            }
        }

        return result
    }
}

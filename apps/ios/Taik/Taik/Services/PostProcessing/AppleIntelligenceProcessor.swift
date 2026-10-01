import Foundation

/// Post-processor using Apple Intelligence (Foundation Models)
/// Available on supported devices with iOS 18.1+ / macOS 15.1+
/// NOTE: This is a stub implementation - Apple Foundation Models API will need to be integrated
final class AppleIntelligenceProcessor: TranscriptPostProcessor {
    let id = "apple-intelligence"
    let displayName = "Apple Intelligence"
    let requiresNetwork = false  // Apple Intelligence runs on-device

    var isAvailable: Bool {
        // TODO: Check for Apple Intelligence availability
        // This will require checking:
        // 1. iOS 18.1+ / macOS 15.1+
        // 2. Device has Apple Silicon (A17 Pro+, M1+)
        // 3. Apple Intelligence is enabled in Settings

        #if os(iOS)
        if #available(iOS 18.1, *) {
            // Check for device capability
            // For now, return false as this is a stub
            return false
        }
        #elseif os(macOS)
        if #available(macOS 15.1, *) {
            return false
        }
        #endif
        return false
    }

    func process(raw: String, locale: Locale, style: TranscriptStyle) async throws -> String {
        guard isAvailable else {
            throw PostProcessorError.processorNotAvailable
        }

        // TODO: Implement using Apple Foundation Models framework
        // Example usage (when available):
        //
        // import FoundationModels
        //
        // let session = LanguageModelSession()
        // let prompt = buildPrompt(raw: raw, style: style)
        // let response = try await session.respond(to: prompt)
        // return response.content

        // For now, fall back to basic cleanup
        return basicCleanup(raw, style: style)
    }

    private func buildPrompt(raw: String, style: TranscriptStyle) -> String {
        switch style {
        case .raw:
            return raw
        case .dictationCleaned:
            return """
            Clean up this dictated text. Fix punctuation, capitalization, and spacing. \
            Do not change the meaning or add content. Only fix formatting issues.

            Text: \(raw)
            """
        case .promptOptimized:
            return """
            Clean up this dictated text for use as an AI prompt. \
            Remove filler words (um, uh, like), fix punctuation, and make it clear and direct. \
            Do not change the intent or add content.

            Text: \(raw)
            """
        }
    }

    private func basicCleanup(_ text: String, style: TranscriptStyle) -> String {
        var result = text.trimmingCharacters(in: .whitespacesAndNewlines)

        if style == .promptOptimized {
            // Remove common filler words
            let fillers = ["um", "uh", "like", "you know", "basically", "actually", "literally"]
            for filler in fillers {
                result = result.replacingOccurrences(
                    of: "\\b\(filler)\\b",
                    with: "",
                    options: [.regularExpression, .caseInsensitive]
                )
            }
        }

        // Collapse multiple spaces
        while result.contains("  ") {
            result = result.replacingOccurrences(of: "  ", with: " ")
        }

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

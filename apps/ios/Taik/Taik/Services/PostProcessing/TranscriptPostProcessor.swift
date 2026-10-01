import Foundation

/// Style of transcript processing
enum TranscriptStyle: String, Codable, CaseIterable {
    case raw                // No processing - return text as-is
    case dictationCleaned   // Clean punctuation, casing, basic formatting
    case promptOptimized    // Optimized for AI prompts (remove filler words, structure)

    var displayName: String {
        switch self {
        case .raw:
            return "Raw"
        case .dictationCleaned:
            return "Cleaned"
        case .promptOptimized:
            return "Prompt Optimized"
        }
    }

    var description: String {
        switch self {
        case .raw:
            return "No processing - exactly as transcribed"
        case .dictationCleaned:
            return "Fix punctuation, capitalization, and spacing"
        case .promptOptimized:
            return "Optimized for AI prompts - removes filler words"
        }
    }
}

/// Error types for post-processing
enum PostProcessorError: LocalizedError {
    case processingFailed(String)
    case processorNotAvailable
    case networkRequired
    case timeout

    var errorDescription: String? {
        switch self {
        case .processingFailed(let reason):
            return "Post-processing failed: \(reason)"
        case .processorNotAvailable:
            return "Post-processor is not available"
        case .networkRequired:
            return "This processor requires network connectivity"
        case .timeout:
            return "Post-processing timed out"
        }
    }
}

/// Protocol for transcript post-processors
/// Implementations can use LLMs (Apple Intelligence, OpenAI, etc.) to clean/enhance transcripts
protocol TranscriptPostProcessor {
    /// Unique identifier for this processor
    var id: String { get }

    /// Human-readable name
    var displayName: String { get }

    /// Whether this processor is available (device support, network, etc.)
    var isAvailable: Bool { get }

    /// Whether this processor requires network
    var requiresNetwork: Bool { get }

    /// Process a raw transcript
    /// - Parameters:
    ///   - raw: The raw transcribed text
    ///   - locale: The locale of the text
    ///   - style: The desired output style
    /// - Returns: The processed text
    func process(raw: String, locale: Locale, style: TranscriptStyle) async throws -> String
}

/// Registry for post-processors
final class PostProcessorRegistry {
    static let shared = PostProcessorRegistry()

    private var processors: [String: TranscriptPostProcessor] = [:]

    private init() {
        // Register default processor
        register(NoOpProcessor())
    }

    func register(_ processor: TranscriptPostProcessor) {
        processors[processor.id] = processor
        print("[PostProcessorRegistry] Registered: \(processor.id)")
    }

    func processor(for id: String) -> TranscriptPostProcessor? {
        processors[id]
    }

    var availableProcessors: [TranscriptPostProcessor] {
        processors.values.filter { $0.isAvailable }
    }

    /// Get the default processor (NoOp)
    var defaultProcessor: TranscriptPostProcessor {
        processors["noop"] ?? NoOpProcessor()
    }
}

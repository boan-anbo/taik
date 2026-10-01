import Foundation
import Network

/// Routes speech recognition requests to the appropriate engine
/// Handles engine selection, fallback, and availability checking
final class SpeechRouter {
    /// Registered speech engines
    private var engines: [SpeechEngineId: SpeechEngine] = [:]

    /// Network path monitor for connectivity checks
    private let networkMonitor = NWPathMonitor()
    private var isNetworkAvailable: Bool = true
    private let monitorQueue = DispatchQueue(label: "app.carrel.taik.speechrouter.network")

    /// Shared instance
    static let shared = SpeechRouter()

    init() {
        setupNetworkMonitoring()
    }

    deinit {
        networkMonitor.cancel()
    }

    // MARK: - Engine Registration

    /// Register a speech engine
    func register(engine: SpeechEngine) {
        engines[engine.id] = engine
        print("[SpeechRouter] Registered engine: \(engine.id.displayName)")
    }

    /// Unregister a speech engine
    func unregister(engineId: SpeechEngineId) {
        engines.removeValue(forKey: engineId)
        print("[SpeechRouter] Unregistered engine: \(engineId.displayName)")
    }

    /// Get all registered engines
    var registeredEngines: [SpeechEngine] {
        Array(engines.values)
    }

    /// Get a specific registered engine
    func engine(for id: SpeechEngineId) -> SpeechEngine? {
        engines[id]
    }

    // MARK: - Engine Selection

    /// Select the best available engine based on preferences and constraints
    /// - Parameters:
    ///   - options: Recognition options that may influence selection
    ///   - selection: User's engine preference and fallback order
    /// - Returns: The selected engine, or an error if none available
    func pickEngine(
        for options: SpeechRecognitionOptions,
        selection: SpeechEngineSelection
    ) async -> Result<SpeechEngine, SpeechEngineError> {
        // Build candidate list: preferred first, then fallbacks
        var candidates = [selection.preferredId] + selection.fallbackOrder

        // Remove duplicates while preserving order
        var seen = Set<SpeechEngineId>()
        candidates = candidates.filter { seen.insert($0).inserted }

        print("[SpeechRouter] Picking engine from candidates: \(candidates.map { $0.rawValue })")
        print("[SpeechRouter] Options: preferOnDevice=\(options.preferOnDevice), locale=\(options.locale.identifier)")

        for candidateId in candidates {
            // Check if engine is registered
            guard let engine = engines[candidateId] else {
                print("[SpeechRouter] Engine \(candidateId.rawValue) not registered, skipping")
                continue
            }

            // Check if engine is available on platform
            guard candidateId.isAvailableOnPlatform else {
                print("[SpeechRouter] Engine \(candidateId.rawValue) not available on platform, skipping")
                continue
            }

            // Check if we need on-device and engine supports it
            if options.preferOnDevice && !engine.capabilities.supportsOnDevice {
                print("[SpeechRouter] Engine \(candidateId.rawValue) doesn't support on-device, skipping")
                continue
            }

            // Check if engine requires network and network is unavailable
            if engine.capabilities.requiresNetwork && !isNetworkAvailable {
                print("[SpeechRouter] Engine \(candidateId.rawValue) requires network but offline, skipping")
                continue
            }

            // Check if locale is supported
            if !engine.capabilities.supportsLocale(options.locale) {
                print("[SpeechRouter] Engine \(candidateId.rawValue) doesn't support locale \(options.locale.identifier), skipping")
                continue
            }

            // Check engine availability (permissions, etc.)
            let availability = await engine.checkAvailability()
            switch availability {
            case .success:
                print("[SpeechRouter] Selected engine: \(candidateId.rawValue)")
                return .success(engine)
            case .failure(let error):
                print("[SpeechRouter] Engine \(candidateId.rawValue) unavailable: \(error.localizedDescription)")
                continue
            }
        }

        // No suitable engine found
        print("[SpeechRouter] No suitable engine found")
        return .failure(.engineNotAvailable(selection.preferredId))
    }

    /// Start a recognition session using the best available engine
    /// - Parameters:
    ///   - options: Recognition options
    ///   - selection: Engine selection preferences
    /// - Returns: An active speech session
    func startSession(
        options: SpeechRecognitionOptions,
        selection: SpeechEngineSelection = .default
    ) async throws -> SpeechSession {
        let engineResult = await pickEngine(for: options, selection: selection)

        switch engineResult {
        case .success(let engine):
            return try await engine.startSession(options: options)
        case .failure(let error):
            throw error
        }
    }

    // MARK: - Availability

    /// Check which engines are currently available
    func availableEngines(for options: SpeechRecognitionOptions) async -> [SpeechEngine] {
        var available: [SpeechEngine] = []

        for engine in engines.values {
            guard engine.id.isAvailableOnPlatform else { continue }

            if options.preferOnDevice && !engine.capabilities.supportsOnDevice {
                continue
            }

            if engine.capabilities.requiresNetwork && !isNetworkAvailable {
                continue
            }

            let availability = await engine.checkAvailability()
            if case .success = availability {
                available.append(engine)
            }
        }

        return available
    }

    /// Get engines that support a specific locale
    func engines(supportingLocale locale: Locale) -> [SpeechEngine] {
        engines.values.filter { $0.capabilities.supportsLocale(locale) }
    }

    // MARK: - Network Monitoring

    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            self?.isNetworkAvailable = path.status == .satisfied
            print("[SpeechRouter] Network status: \(path.status == .satisfied ? "available" : "unavailable")")
        }
        networkMonitor.start(queue: monitorQueue)
    }

    /// Current network availability
    var networkAvailable: Bool {
        isNetworkAvailable
    }
}

// MARK: - Convenience Methods

extension SpeechRouter {
    /// Quick check if any engine is available for the given options
    func hasAvailableEngine(for options: SpeechRecognitionOptions) async -> Bool {
        let available = await availableEngines(for: options)
        return !available.isEmpty
    }

    /// Get the preferred engine based on selection, without starting a session
    func preferredEngine(
        for options: SpeechRecognitionOptions,
        selection: SpeechEngineSelection = .default
    ) async -> SpeechEngine? {
        let result = await pickEngine(for: options, selection: selection)
        if case .success(let engine) = result {
            return engine
        }
        return nil
    }
}

import Foundation

enum Logger {
    private static let lock = NSLock()

    static func info(_ message: String) {
        lock.lock()
        defer { lock.unlock() }
        fputs("[ditto] \(message)\n", stderr)
    }
}

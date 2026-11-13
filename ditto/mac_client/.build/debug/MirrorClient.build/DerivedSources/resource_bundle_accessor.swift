import Foundation

extension Foundation.Bundle {
    static let module: Bundle = {
        let mainPath = Bundle.main.bundleURL.appendingPathComponent("MirrorClient_MirrorClient.bundle").path
        let buildPath = "/Users/atharvpaharia100/Desktop/Projects/ditto/mac_client/.build/arm64-apple-macosx/debug/MirrorClient_MirrorClient.bundle"

        let preferredBundle = Bundle(path: mainPath)

        guard let bundle = preferredBundle ?? Bundle(path: buildPath) else {
            // Users can write a function called fatalError themselves, we should be resilient against that.
            Swift.fatalError("could not load resource bundle: from \(mainPath) or \(buildPath)")
        }

        return bundle
    }()
}
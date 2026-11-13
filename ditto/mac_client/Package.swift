// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "MirrorClient",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "MirrorClient", targets: ["MirrorClient"])
    ],
    targets: [
        .executableTarget(
            name: "MirrorClient",
            path: ".",
            exclude: ["Package.swift", "Sources/MirrorClient/Shaders.metal"],
            sources: ["Sources/MirrorClient"],
            resources: [.process("Resources")],
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("Metal"),
                .linkedFramework("QuartzCore"),
                .linkedFramework("VideoToolbox"),
                .linkedFramework("Network"),
                .linkedFramework("CoreVideo")
            ]
        )
    ]
)

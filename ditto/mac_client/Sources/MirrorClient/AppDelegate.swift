import AppKit
import Darwin

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let renderer = MetalRenderer(frame: .zero)
    private var receiver: NetworkReceiver?
    private var reassembler: FrameReassembler?
    private var decoder: VideoToolboxDecoder?
    private var window: NSWindow?
    private var keyMonitor: Any?
    private let pipelineQueue = DispatchQueue(label: "ditto.pipeline", qos: .userInteractive)
    private var packetsReceived: UInt64 = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0)
        NSApp.presentationOptions = [.autoHideDock, .autoHideMenuBar, .disableProcessSwitching, .disableSessionTermination]

        let window = NSWindow(
            contentRect: NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1280, height: 720),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.level = .mainMenu + 1
        window.collectionBehavior = [.fullScreenPrimary, .canJoinAllSpaces]
        window.contentView = renderer
        window.initialFirstResponder = renderer
        window.makeKeyAndOrderFront(nil)
        window.makeFirstResponder(renderer)
        self.window = window
        NSApp.activate(ignoringOtherApps: true)
        installQuitHandlers()

        decoder = VideoToolboxDecoder { [weak self] pixelBuffer, timestamp in
            self?.renderer.enqueue(pixelBuffer: pixelBuffer, captureTimestampMicros: timestamp)
        }

        reassembler = FrameReassembler { [weak self] in
            self?.requestKeyframe()
        }

        receiver = NetworkReceiver { [weak self] packet in
            self?.pipelineQueue.async {
                self?.packetsReceived += 1
                if self?.packetsReceived == 1 {
                    Logger.info("first packet received: type=\(packet.header.type.rawValue) frame=\(packet.header.frameID)")
                }
                guard let frame = self?.reassembler?.ingest(packet) else { return }
                self?.decoder?.decode(frame: frame)
            }
        }

        do {
            try receiver?.start(port: 7777)
            Logger.info("listening for UDP video on port 7777")
        } catch {
            Logger.info("failed to start UDP receiver: \(error)")
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        if let keyMonitor {
            NSEvent.removeMonitor(keyMonitor)
        }
    }

    private func requestKeyframe() {
        let host = ProcessInfo.processInfo.environment["DITTO_HOST"] ?? "192.168.77.1"
        let command = "KEYFRAME_REQ\n"
        let socket = socket(AF_INET, SOCK_STREAM, 0)
        guard socket >= 0 else { return }
        defer { close(socket) }

        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(7778).bigEndian
        inet_pton(AF_INET, host, &address.sin_addr)
        withUnsafePointer(to: &address) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { rawAddress in
                _ = connect(socket, rawAddress, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        _ = command.withCString { send(socket, $0, strlen($0), 0) }
    }

    private func installQuitHandlers() {
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 53 {
                Logger.info("escape pressed, terminating client")
                NSApp.terminate(self)
                return nil
            }
            if event.modifierFlags.contains(.command),
               event.charactersIgnoringModifiers?.lowercased() == "q" {
                Logger.info("cmd+q pressed, terminating client")
                NSApp.terminate(self)
                return nil
            }
            return event
        }
    }
}

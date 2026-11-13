import AppKit
import CoreVideo
import Metal
import QuartzCore

final class MetalRenderer: NSView {
    private let device = MTLCreateSystemDefaultDevice()!
    private lazy var commandQueue = device.makeCommandQueue()!
    private var textureCache: CVMetalTextureCache?
    private let metalLayer = CAMetalLayer()
    private var displayLink: CVDisplayLink?
    private let lock = NSLock()
    private var latestPixelBuffer: CVPixelBuffer?
    private var latestTimestampMicros: Int64 = 0
    private var loggedFirstFrame = false

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        metalLayer.device = device
        metalLayer.pixelFormat = .bgra8Unorm
        metalLayer.framebufferOnly = true
        metalLayer.maximumDrawableCount = 2
        metalLayer.displaySyncEnabled = true
        layer = metalLayer
        CVMetalTextureCacheCreate(kCFAllocatorDefault, nil, device, nil, &textureCache)
        startDisplayLink()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        if let displayLink {
            CVDisplayLinkStop(displayLink)
        }
    }

    override var acceptsFirstResponder: Bool { true }

    override func layout() {
        super.layout()
        metalLayer.frame = bounds
    }

    func enqueue(pixelBuffer: CVPixelBuffer, captureTimestampMicros: Int64) {
        lock.lock()
        if !loggedFirstFrame {
            loggedFirstFrame = true
            Logger.info("first decoded frame reached renderer: \(CVPixelBufferGetWidth(pixelBuffer))x\(CVPixelBufferGetHeight(pixelBuffer))")
        }
        latestPixelBuffer = pixelBuffer
        latestTimestampMicros = captureTimestampMicros
        lock.unlock()
    }

    private func startDisplayLink() {
        CVDisplayLinkCreateWithActiveCGDisplays(&displayLink)
        CVDisplayLinkSetOutputCallback(displayLink!, { _, _, _, _, _, context in
            let renderer = Unmanaged<MetalRenderer>.fromOpaque(context!).takeUnretainedValue()
            renderer.drawFrame()
            return kCVReturnSuccess
        }, UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()))
        CVDisplayLinkSetCurrentCGDisplay(displayLink!, CGMainDisplayID())
        CVDisplayLinkStart(displayLink!)
    }

    private func drawFrame() {
        autoreleasepool {
            lock.lock()
            guard let pixelBuffer = latestPixelBuffer else {
                lock.unlock()
                return
            }
            let captureTimestampMicros = latestTimestampMicros
            lock.unlock()

            guard let drawable = metalLayer.nextDrawable(),
                  let commandBuffer = commandQueue.makeCommandBuffer(),
                  let textureCache,
                  let sourceTexture = makeTexture(from: pixelBuffer, cache: textureCache) else {
                return
            }

            let blit = commandBuffer.makeBlitCommandEncoder()
            blit?.copy(from: sourceTexture, sourceSlice: 0, sourceLevel: 0, sourceOrigin: .init(x: 0, y: 0, z: 0), sourceSize: .init(width: sourceTexture.width, height: sourceTexture.height, depth: 1), to: drawable.texture, destinationSlice: 0, destinationLevel: 0, destinationOrigin: .init(x: 0, y: 0, z: 0))
            blit?.endEncoding()

            let nowMicros = Int64(DispatchTime.now().uptimeNanoseconds / 1_000)
            if captureTimestampMicros >= 0, nowMicros >= captureTimestampMicros {
                let deltaMs = Double(nowMicros - captureTimestampMicros) / 1000.0
                commandBuffer.label = String(format: "latency %.2fms", deltaMs)
            } else {
                commandBuffer.label = "latency n/a"
            }
            commandBuffer.present(drawable)
            commandBuffer.commit()
        }
    }

    private func makeTexture(from pixelBuffer: CVPixelBuffer, cache: CVMetalTextureCache) -> MTLTexture? {
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        var cvTexture: CVMetalTexture?
        let status = CVMetalTextureCacheCreateTextureFromImage(kCFAllocatorDefault, cache, pixelBuffer, nil, .bgra8Unorm, width, height, 0, &cvTexture)
        guard status == kCVReturnSuccess, let cvTexture else { return nil }
        return CVMetalTextureGetTexture(cvTexture)
    }
}

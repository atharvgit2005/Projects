import Foundation

struct ReassembledFrame {
    let frameID: UInt32
    let captureTimestampMicros: Int64
    let isKeyframe: Bool
    let payload: Data
}

final class FrameReassembler {
    private struct FrameBuffer {
        let createdAt: DispatchTime
        let fragmentCount: UInt32
        let captureTimestampMicros: Int64
        let isKeyframe: Bool
        var fragments: [UInt32: Data]
        var parity: [UInt32: Data]
    }

    private let lock = NSLock()
    private var frames: [UInt32: FrameBuffer] = [:]
    private let keyframeRequester: () -> Void
    private var lastCompletedFrameID: UInt32 = 0

    init(keyframeRequester: @escaping () -> Void) {
        self.keyframeRequester = keyframeRequester
    }

    func ingest(_ packet: MirrorPacket) -> ReassembledFrame? {
        lock.lock()
        defer { lock.unlock() }

        purgeExpiredFrames()

        switch packet.header.type {
        case .frameData:
            if lastCompletedFrameID != 0 && packet.header.frameID + 120 < lastCompletedFrameID {
                return nil
            }
            var buffer = frames[packet.header.frameID] ?? FrameBuffer(
                createdAt: .now(),
                fragmentCount: packet.header.fragmentCount,
                captureTimestampMicros: packet.header.captureTimestampMicros,
                isKeyframe: (packet.header.flags & 0x1) != 0,
                fragments: [:],
                parity: [:]
            )
            buffer.fragments[packet.header.fragmentIndex] = packet.payload
            frames[packet.header.frameID] = buffer
        case .fec:
            var buffer = frames[packet.header.frameID] ?? FrameBuffer(
                createdAt: .now(),
                fragmentCount: packet.header.fragmentCount,
                captureTimestampMicros: packet.header.captureTimestampMicros,
                isKeyframe: false,
                fragments: [:],
                parity: [:]
            )
            buffer.parity[packet.header.fragmentIndex] = packet.payload
            frames[packet.header.frameID] = buffer
        default:
            return nil
        }

        guard var frame = frames[packet.header.frameID] else { return nil }
        applyFEC(to: &frame)
        if frame.fragments.count == Int(frame.fragmentCount) {
            let payload = (0..<frame.fragmentCount).compactMap { frame.fragments[$0] }.reduce(into: Data()) {
                $0.append($1)
            }
            frames.removeValue(forKey: packet.header.frameID)
            lastCompletedFrameID = packet.header.frameID
            return ReassembledFrame(
                frameID: packet.header.frameID,
                captureTimestampMicros: frame.captureTimestampMicros,
                isKeyframe: frame.isKeyframe,
                payload: payload
            )
        }

        frames[packet.header.frameID] = frame
        return nil
    }

    private func purgeExpiredFrames() {
        let now = DispatchTime.now().uptimeNanoseconds
        let expiredIDs = frames.compactMap { key, value -> UInt32? in
            let ageMs = Double(now - value.createdAt.uptimeNanoseconds) / 1_000_000
            return ageMs > 32 ? key : nil
        }
        if !expiredIDs.isEmpty {
            Logger.info("dropping \(expiredIDs.count) incomplete frame(s); requesting keyframe")
            keyframeRequester()
        }
        for id in expiredIDs {
            frames.removeValue(forKey: id)
        }
    }

    private func applyFEC(to frame: inout FrameBuffer) {
        guard !frame.parity.isEmpty else { return }
        let maxGroup = Int((frame.fragmentCount + 3) / 4)
        for group in 0..<maxGroup {
            let groupEnd = min(Int(frame.fragmentCount), group * 4 + 4)
            let missing = (group * 4..<groupEnd).filter { frame.fragments[UInt32($0)] == nil }
            guard missing.count == 1 else { continue }
            guard let parity = frame.parity[UInt32(groupEnd - 1)] else { continue }
            var recovered = [UInt8](parity)
            for index in group * 4..<groupEnd where index != missing[0] {
                guard let fragment = frame.fragments[UInt32(index)] else { continue }
                let bytes = [UInt8](fragment)
                for i in 0..<min(recovered.count, bytes.count) {
                    recovered[i] ^= bytes[i]
                }
            }
            frame.fragments[UInt32(missing[0])] = Data(recovered)
        }
    }
}

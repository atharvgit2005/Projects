import CoreMedia
import CoreVideo
import Foundation
import VideoToolbox

final class VideoToolboxDecoder {
    typealias FrameHandler = (CVPixelBuffer, Int64) -> Void

    private var session: VTDecompressionSession?
    private var formatDescription: CMVideoFormatDescription?
    private let frameHandler: FrameHandler
    private var sps: Data?
    private var pps: Data?
    private var lastDecodedFrameID: UInt32 = 0

    init(frameHandler: @escaping FrameHandler) {
        self.frameHandler = frameHandler
    }

    func decode(frame: ReassembledFrame) {
        let accessUnit = H264AccessUnit(data: frame.payload)
        guard accessUnit.isValid else {
            Logger.info("dropping frame \(frame.frameID): no valid Annex B NAL units")
            return
        }

        if let sps = accessUnit.sps { self.sps = sps }
        if let pps = accessUnit.pps { self.pps = pps }

        guard let sps, let pps else {
            if frame.isKeyframe {
                Logger.info("frame \(frame.frameID): keyframe arrived without SPS/PPS, waiting for next IDR")
            }
            return
        }

        guard ensureSession(sps: sps, pps: pps) else {
            Logger.info("failed to configure VideoToolbox session")
            return
        }

        let sampleData = accessUnit.makeAVCCSample()
        guard !sampleData.isEmpty else {
            Logger.info("dropping frame \(frame.frameID): no decodable VCL payload")
            return
        }

        let blockBufferStatus = sampleData.withUnsafeBytes { bytes -> CMBlockBuffer? in
            var blockBuffer: CMBlockBuffer?
            let status = CMBlockBufferCreateWithMemoryBlock(
                allocator: kCFAllocatorDefault,
                memoryBlock: nil,
                blockLength: sampleData.count,
                blockAllocator: nil,
                customBlockSource: nil,
                offsetToData: 0,
                dataLength: sampleData.count,
                flags: 0,
                blockBufferOut: &blockBuffer
            )
            guard status == kCMBlockBufferNoErr, let blockBuffer else { return nil }
            CMBlockBufferReplaceDataBytes(with: bytes.baseAddress!, blockBuffer: blockBuffer, offsetIntoDestination: 0, dataLength: sampleData.count)
            return blockBuffer
        }

        guard let blockBufferStatus, let formatDescription else { return }
        var sampleBuffer: CMSampleBuffer?
        var timing = CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: .invalid, decodeTimeStamp: .invalid)
        let sizes = [sampleData.count]
        let status = CMSampleBufferCreateReady(
            allocator: kCFAllocatorDefault,
            dataBuffer: blockBufferStatus,
            formatDescription: formatDescription,
            sampleCount: 1,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timing,
            sampleSizeEntryCount: 1,
            sampleSizeArray: sizes,
            sampleBufferOut: &sampleBuffer
        )
        guard status == noErr, let sampleBuffer, let session else { return }

        var infoFlags = VTDecodeInfoFlags()
        let context = DecodeContext(frameID: frame.frameID, captureTimestampMicros: frame.captureTimestampMicros)
        let decodeStatus = VTDecompressionSessionDecodeFrame(
            session,
            sampleBuffer: sampleBuffer,
            flags: [._EnableAsynchronousDecompression, ._1xRealTimePlayback],
            frameRefcon: Unmanaged.passRetained(context).toOpaque(),
            infoFlagsOut: &infoFlags
        )
        if decodeStatus != noErr {
            Logger.info("decode submit failed for frame \(frame.frameID): \(decodeStatus)")
            return
        }

        if infoFlags.contains(.frameDropped) {
            Logger.info("VideoToolbox dropped frame \(frame.frameID)")
            return
        }

        lastDecodedFrameID = frame.frameID
        if frame.isKeyframe {
            Logger.info("submitted keyframe \(frame.frameID) with \(accessUnit.nalUnits.count) NAL units")
        }
    }

    private func ensureSession(sps: Data, pps: Data) -> Bool {
        if let current = formatDescription, let session,
           H264AccessUnit.matchesParameterSets(formatDescription: current, sps: sps, pps: pps) {
            _ = session
            return true
        }

        invalidateSession()

        var formatDescription: CMVideoFormatDescription?
        let createStatus = sps.withUnsafeBytes { spsBytes in
            pps.withUnsafeBytes { ppsBytes in
                let pointers: [UnsafePointer<UInt8>] = [
                    spsBytes.baseAddress!.assumingMemoryBound(to: UInt8.self),
                    ppsBytes.baseAddress!.assumingMemoryBound(to: UInt8.self)
                ]
                let sizes = [sps.count, pps.count]
                return CMVideoFormatDescriptionCreateFromH264ParameterSets(
                    allocator: kCFAllocatorDefault,
                    parameterSetCount: 2,
                    parameterSetPointers: pointers,
                    parameterSetSizes: sizes,
                    nalUnitHeaderLength: 4,
                    formatDescriptionOut: &formatDescription
                )
            }
        }
        guard createStatus == noErr, let formatDescription else {
            return false
        }
        self.formatDescription = formatDescription

        var callback = VTDecompressionOutputCallbackRecord(
            decompressionOutputCallback: { refCon, frameRefCon, status, _, imageBuffer, _, _ in
                guard let frameRefCon else { return }
                let context = Unmanaged<DecodeContext>.fromOpaque(frameRefCon).takeRetainedValue()
                guard status == noErr, let imageBuffer, let refCon else {
                    Logger.info("decode callback failed for frame \(context.frameID): \(status)")
                    return
                }
                let decoder = Unmanaged<VideoToolboxDecoder>.fromOpaque(refCon).takeUnretainedValue()
                decoder.frameHandler(imageBuffer, context.captureTimestampMicros)
            },
            decompressionOutputRefCon: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        )

        let attrs: [NSString: Any] = [
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey: true
        ]
        return VTDecompressionSessionCreate(
            allocator: kCFAllocatorDefault,
            formatDescription: formatDescription,
            decoderSpecification: [
                kVTVideoDecoderSpecification_RequireHardwareAcceleratedVideoDecoder as String: true
            ] as CFDictionary,
            imageBufferAttributes: attrs as CFDictionary,
            outputCallback: &callback,
            decompressionSessionOut: &session
        ) == noErr
    }

    private func invalidateSession() {
        if let session {
            VTDecompressionSessionInvalidate(session)
        }
        session = nil
        formatDescription = nil
    }
}

private final class DecodeContext {
    let frameID: UInt32
    let captureTimestampMicros: Int64

    init(frameID: UInt32, captureTimestampMicros: Int64) {
        self.frameID = frameID
        self.captureTimestampMicros = captureTimestampMicros
    }
}

private struct H264NALUnit {
    let type: UInt8
    let payload: Data
}

private struct H264AccessUnit {
    let nalUnits: [H264NALUnit]

    init(data: Data) {
        self.nalUnits = H264AccessUnit.parseAnnexB(data: data)
    }

    var isValid: Bool {
        !nalUnits.isEmpty
    }

    var sps: Data? {
        nalUnits.first(where: { $0.type == 7 })?.payload
    }

    var pps: Data? {
        nalUnits.first(where: { $0.type == 8 })?.payload
    }

    func makeAVCCSample() -> Data {
        var sample = Data()
        for unit in nalUnits {
            switch unit.type {
            case 1, 5, 6:
                var length = UInt32(unit.payload.count).bigEndian
                withUnsafeBytes(of: &length) { sample.append(contentsOf: $0) }
                sample.append(unit.payload)
            default:
                continue
            }
        }
        return sample
    }

    static func matchesParameterSets(formatDescription: CMVideoFormatDescription, sps: Data, pps: Data) -> Bool {
        guard let existingSPS = copyParameterSet(at: 0, from: formatDescription),
              let existingPPS = copyParameterSet(at: 1, from: formatDescription) else {
            return false
        }
        return existingSPS == sps && existingPPS == pps
    }

    private static func copyParameterSet(at index: Int, from formatDescription: CMFormatDescription) -> Data? {
        var pointer: UnsafePointer<UInt8>?
        var size = 0
        var count = 0
        let status = CMVideoFormatDescriptionGetH264ParameterSetAtIndex(
            formatDescription,
            parameterSetIndex: index,
            parameterSetPointerOut: &pointer,
            parameterSetSizeOut: &size,
            parameterSetCountOut: &count,
            nalUnitHeaderLengthOut: nil
        )
        guard status == noErr, let pointer else { return nil }
        return Data(bytes: pointer, count: size)
    }

    private static func parseAnnexB(data: Data) -> [H264NALUnit] {
        let bytes = [UInt8](data)
        var units: [H264NALUnit] = []
        var cursor = 0

        func startCodeLength(at index: Int) -> Int {
            guard index + 3 < bytes.count else { return 0 }
            if bytes[index] == 0, bytes[index + 1] == 0, bytes[index + 2] == 1 {
                return 3
            }
            if index + 4 < bytes.count, bytes[index] == 0, bytes[index + 1] == 0,
               bytes[index + 2] == 0, bytes[index + 3] == 1 {
                return 4
            }
            return 0
        }

        while cursor < bytes.count {
            let prefix = startCodeLength(at: cursor)
            if prefix == 0 {
                cursor += 1
                continue
            }

            let nalStart = cursor + prefix
            var nalEnd = nalStart
            while nalEnd < bytes.count, startCodeLength(at: nalEnd) == 0 {
                nalEnd += 1
            }

            if nalEnd > nalStart {
                let payload = Data(bytes[nalStart..<nalEnd])
                let type = payload.first.map { $0 & 0x1F } ?? 0
                units.append(H264NALUnit(type: type, payload: payload))
            }
            cursor = nalEnd
        }

        return units
    }
}

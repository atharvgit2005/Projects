import Foundation

enum PacketType: UInt8 {
    case frameData = 1
    case keyframeRequest = 2
    case handshake = 3
    case caps = 4
    case fec = 5
}

struct MirrorPacketHeader {
    static let magic = [UInt8]("MDIR".utf8)
    static let byteSize = 30

    var version: UInt8
    var type: PacketType
    var flags: UInt16
    var frameID: UInt32
    var fragmentIndex: UInt32
    var fragmentCount: UInt32
    var captureTimestampMicros: Int64
    var payloadLength: UInt16
}

struct MirrorPacket {
    var header: MirrorPacketHeader
    var payload: Data

    init?(data: Data) {
        guard data.count >= MirrorPacketHeader.byteSize else { return nil }
        let bytes = [UInt8](data)
        guard Array(bytes[0..<4]) == MirrorPacketHeader.magic else { return nil }
        guard bytes[4] == 1 else { return nil }
        guard let type = PacketType(rawValue: bytes[5]) else { return nil }

        func read16(_ index: Int) -> UInt16 {
            UInt16(bytes[index]) | (UInt16(bytes[index + 1]) << 8)
        }

        func read32(_ index: Int) -> UInt32 {
            UInt32(bytes[index]) |
            (UInt32(bytes[index + 1]) << 8) |
            (UInt32(bytes[index + 2]) << 16) |
            (UInt32(bytes[index + 3]) << 24)
        }

        func read64(_ index: Int) -> Int64 {
            var value: UInt64 = 0
            for shift in 0..<8 {
                value |= UInt64(bytes[index + shift]) << (UInt64(shift) * 8)
            }
            return Int64(bitPattern: value)
        }

        let header = MirrorPacketHeader(
            version: bytes[4],
            type: type,
            flags: read16(6),
            frameID: read32(8),
            fragmentIndex: read32(12),
            fragmentCount: read32(16),
            captureTimestampMicros: read64(20),
            payloadLength: read16(28)
        )

        guard data.count == MirrorPacketHeader.byteSize + Int(header.payloadLength) else { return nil }
        self.header = header
        self.payload = data.subdata(in: MirrorPacketHeader.byteSize..<data.count)
    }
}

struct CircularBuffer<Element> {
    private var storage: [Element?]
    private var readIndex = 0
    private var writeIndex = 0
    private var count = 0

    init(capacity: Int) {
        storage = Array(repeating: nil, count: capacity)
    }

    mutating func push(_ element: Element) -> Bool {
        guard count < storage.count else { return false }
        storage[writeIndex] = element
        writeIndex = (writeIndex + 1) % storage.count
        count += 1
        return true
    }

    mutating func pop() -> Element? {
        guard count > 0 else { return nil }
        defer {
            storage[readIndex] = nil
            readIndex = (readIndex + 1) % storage.count
            count -= 1
        }
        return storage[readIndex]
    }
}

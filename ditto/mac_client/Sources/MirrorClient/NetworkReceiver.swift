import Foundation
import Network

final class NetworkReceiver {
    private let queue = DispatchQueue(label: "ditto.network.rx", qos: .userInteractive)
    private var listener: NWListener?
    private var connection: NWConnection?
    private let packetHandler: (MirrorPacket) -> Void

    init(packetHandler: @escaping (MirrorPacket) -> Void) {
        self.packetHandler = packetHandler
    }

    func start(port: UInt16) throws {
        let parameters = NWParameters.udp
        parameters.allowLocalEndpointReuse = true
        listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!)
        listener?.stateUpdateHandler = { state in
            if case .failed(let error) = state {
                fputs("UDP listener failed: \(error)\n", stderr)
            }
        }
        listener?.newConnectionHandler = { [weak self] connection in
            self?.bind(connection)
        }
        listener?.start(queue: queue)
    }

    private func bind(_ connection: NWConnection) {
        self.connection = connection
        connection.stateUpdateHandler = { state in
            if case .failed(let error) = state {
                fputs("UDP connection failed: \(error)\n", stderr)
            }
        }
        connection.start(queue: queue)
        receiveNext(on: connection)
    }

    private func receiveNext(on connection: NWConnection) {
        connection.receiveMessage { [weak self] data, _, _, error in
            if let error {
                fputs("UDP receive error: \(error)\n", stderr)
            }
            if let data, let packet = MirrorPacket(data: data) {
                self?.packetHandler(packet)
            }
            self?.receiveNext(on: connection)
        }
    }
}

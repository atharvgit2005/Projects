#pragma once

#include "protocol.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <span>
#include <vector>

namespace ditto {

struct PacketBuffer {
  MirrorPacketHeader header{};
  std::vector<std::uint8_t> payload;
};

inline bool IsValidHeader(const MirrorPacketHeader& header) {
  return std::memcmp(header.magic, kMagic, sizeof(kMagic)) == 0 &&
         header.version == kProtocolVersion;
}

inline void InitializeHeader(MirrorPacketHeader& header, PacketType type) {
  std::memcpy(header.magic, kMagic, sizeof(kMagic));
  header.version = kProtocolVersion;
  header.type = static_cast<std::uint8_t>(type);
}

inline std::vector<std::uint8_t> SerializePacket(const PacketBuffer& packet) {
  std::vector<std::uint8_t> bytes(sizeof(MirrorPacketHeader) + packet.payload.size());
  auto* header = reinterpret_cast<MirrorPacketHeader*>(bytes.data());
  *header = packet.header;
  if (!packet.payload.empty()) {
    std::memcpy(bytes.data() + sizeof(MirrorPacketHeader), packet.payload.data(),
                packet.payload.size());
  }
  return bytes;
}

inline bool DeserializePacket(std::span<const std::uint8_t> bytes, PacketBuffer& out) {
  if (bytes.size() < sizeof(MirrorPacketHeader)) {
    return false;
  }

  std::memcpy(&out.header, bytes.data(), sizeof(MirrorPacketHeader));
  if (!IsValidHeader(out.header)) {
    return false;
  }
  if (bytes.size() != sizeof(MirrorPacketHeader) + out.header.payload_len) {
    return false;
  }

  out.payload.resize(out.header.payload_len);
  if (out.header.payload_len > 0) {
    std::memcpy(out.payload.data(), bytes.data() + sizeof(MirrorPacketHeader),
                out.header.payload_len);
  }
  return true;
}

}  // namespace ditto

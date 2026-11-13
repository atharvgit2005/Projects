#pragma once

#include "common.h"

#include "../shared/packet.h"

namespace ditto {

class Packetizer {
 public:
  static constexpr std::size_t kMaxPayloadBytes = 1380;

  std::vector<PacketBuffer> PacketizeFrame(const EncodedFrame& frame) const;
};

}  // namespace ditto

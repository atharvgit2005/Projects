#pragma once

#include "common.h"

#include "../shared/packet.h"

namespace ditto {

class UdpStreamer {
 public:
  ~UdpStreamer();

  bool Init(const std::string& remote_ip, std::uint16_t port);
  bool Send(const PacketBuffer& packet);

 private:
  SOCKET socket_ = INVALID_SOCKET;
  sockaddr_in remote_addr_{};
};

}  // namespace ditto

#include "udp_streamer.h"

#include <Ws2tcpip.h>
#include <iostream>

namespace ditto {

UdpStreamer::~UdpStreamer() {
  if (socket_ != INVALID_SOCKET) {
    closesocket(socket_);
  }
  WSACleanup();
}

bool UdpStreamer::Init(const std::string& remote_ip, std::uint16_t port) {
  WSADATA wsa{};
  if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
    return false;
  }

  socket_ = ::socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
  if (socket_ == INVALID_SOCKET) {
    return false;
  }

  u_long non_blocking = 1;
  ioctlsocket(socket_, FIONBIO, &non_blocking);

  int tos = 0x28;
  setsockopt(socket_, IPPROTO_IP, IP_TOS, reinterpret_cast<const char*>(&tos), sizeof(tos));

  remote_addr_.sin_family = AF_INET;
  remote_addr_.sin_port = htons(port);
  inet_pton(AF_INET, remote_ip.c_str(), &remote_addr_.sin_addr);
  return true;
}

bool UdpStreamer::Send(const PacketBuffer& packet) {
  auto bytes = SerializePacket(packet);
  const int sent =
      sendto(socket_, reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()), 0,
             reinterpret_cast<const sockaddr*>(&remote_addr_), sizeof(remote_addr_));
  if (sent == SOCKET_ERROR) {
    const int error = WSAGetLastError();
    return error == WSAEWOULDBLOCK;
  }
  return true;
}

}  // namespace ditto

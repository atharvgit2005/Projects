#include "control_server.h"

#include <Ws2tcpip.h>

namespace ditto {

ControlServer::~ControlServer() { Stop(); }

bool ControlServer::Start(std::uint16_t port, CommandCallback callback) {
  callback_ = std::move(callback);
  WSADATA wsa{};
  if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
    return false;
  }

  listen_socket_ = ::socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
  if (listen_socket_ == INVALID_SOCKET) {
    return false;
  }

  sockaddr_in addr{};
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = INADDR_ANY;
  addr.sin_port = htons(port);
  if (bind(listen_socket_, reinterpret_cast<const sockaddr*>(&addr), sizeof(addr)) != 0) {
    return false;
  }
  if (listen(listen_socket_, 1) != 0) {
    return false;
  }

  running_ = true;
  thread_ = std::thread(&ControlServer::Run, this);
  return true;
}

void ControlServer::Stop() {
  running_ = false;
  if (listen_socket_ != INVALID_SOCKET) {
    closesocket(listen_socket_);
    listen_socket_ = INVALID_SOCKET;
  }
  if (thread_.joinable()) {
    thread_.join();
  }
}

void ControlServer::Run() {
  while (running_) {
    sockaddr_in client{};
    int client_len = sizeof(client);
    SOCKET socket = accept(listen_socket_, reinterpret_cast<sockaddr*>(&client), &client_len);
    if (socket == INVALID_SOCKET) {
      continue;
    }

    char buffer[256];
    const int read = recv(socket, buffer, sizeof(buffer) - 1, 0);
    if (read > 0) {
      buffer[read] = '\0';
      callback_(std::string_view(buffer, static_cast<std::size_t>(read)));
    }
    closesocket(socket);
  }
}

}  // namespace ditto

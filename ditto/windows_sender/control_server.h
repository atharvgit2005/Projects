#pragma once

#include "common.h"

namespace ditto {

class ControlServer {
 public:
  using CommandCallback = std::function<void(std::string_view)>;

  ~ControlServer();
  bool Start(std::uint16_t port, CommandCallback callback);
  void Stop();

 private:
  void Run();

  SOCKET listen_socket_ = INVALID_SOCKET;
  std::thread thread_;
  std::atomic<bool> running_{false};
  CommandCallback callback_;
};

}  // namespace ditto

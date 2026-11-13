#pragma once

#include <Windows.h>
#include <avrt.h>
#include <d3d11.h>
#include <wrl/client.h>

#include <array>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <span>
#include <string>
#include <thread>
#include <vector>

namespace ditto {

using Microsoft::WRL::ComPtr;

enum class Codec : std::uint8_t {
  H264 = 0,
  H265 = 1,
};

struct SenderConfig {
  std::string remote_ip = "192.168.77.2";
  std::uint16_t udp_port = 7777;
  std::uint16_t control_port = 7778;
  std::uint32_t width = 1920;
  std::uint32_t height = 1080;
  std::uint32_t fps = 60;
  std::uint32_t bitrate_kbps = 20000;
  Codec codec = Codec::H264;
  bool test_pattern = false;
};

struct CapturedFrame {
  ComPtr<ID3D11Texture2D> texture;
  std::int64_t pts_us = 0;
  std::uint32_t width = 0;
  std::uint32_t height = 0;
  std::uint64_t sequence = 0;
};

struct EncodedFrame {
  std::vector<std::uint8_t> bytes;
  std::int64_t pts_us = 0;
  std::uint32_t frame_id = 0;
  bool keyframe = false;
};

template <typename T, std::size_t Capacity>
class SpscQueue {
 public:
  bool Push(T value) {
    const auto head = head_.load(std::memory_order_relaxed);
    const auto next = (head + 1) % slots_.size();
    if (next == tail_.load(std::memory_order_acquire)) {
      return false;
    }
    slots_[head] = std::move(value);
    head_.store(next, std::memory_order_release);
    return true;
  }

  bool Pop(T& out) {
    const auto tail = tail_.load(std::memory_order_relaxed);
    if (tail == head_.load(std::memory_order_acquire)) {
      return false;
    }
    out = std::move(slots_[tail]);
    tail_.store((tail + 1) % slots_.size(), std::memory_order_release);
    return true;
  }

 private:
  std::array<T, Capacity + 1> slots_{};
  std::atomic<std::size_t> head_{0};
  std::atomic<std::size_t> tail_{0};
};

inline std::int64_t NowMicros() {
  using namespace std::chrono;
  return duration_cast<microseconds>(steady_clock::now().time_since_epoch()).count();
}

inline void PinRealtimeThread(const wchar_t* mmcss_task, DWORD affinity_mask) {
  if (affinity_mask != 0) {
    SetThreadAffinityMask(GetCurrentThread(), affinity_mask);
  }
  if (mmcss_task) {
    DWORD task_index = 0;
    AvSetMmThreadCharacteristicsW(mmcss_task, &task_index);
  }
}

}  // namespace ditto

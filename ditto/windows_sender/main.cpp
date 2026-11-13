#include "common.h"
#include "control_server.h"
#include "dxgi_capture.h"
#include "gpu_encoder.h"
#include "packetizer.h"
#include "udp_streamer.h"

#include <iostream>

namespace ditto {
namespace {

SenderConfig ParseArgs(int argc, char** argv) {
  SenderConfig cfg;
  for (int i = 1; i < argc; ++i) {
    std::string_view arg = argv[i];
    if (arg == "--test-pattern") {
      cfg.test_pattern = true;
    } else if (arg == "--ip" && i + 1 < argc) {
      cfg.remote_ip = argv[++i];
    } else if (arg == "--width" && i + 1 < argc) {
      cfg.width = static_cast<std::uint32_t>(std::stoul(argv[++i]));
    } else if (arg == "--height" && i + 1 < argc) {
      cfg.height = static_cast<std::uint32_t>(std::stoul(argv[++i]));
    } else if (arg == "--fps" && i + 1 < argc) {
      cfg.fps = static_cast<std::uint32_t>(std::stoul(argv[++i]));
    } else if (arg == "--bitrate" && i + 1 < argc) {
      cfg.bitrate_kbps = static_cast<std::uint32_t>(std::stoul(argv[++i]));
    }
  }
  return cfg;
}

}  // namespace
}  // namespace ditto

int main(int argc, char** argv) {
  using namespace ditto;

  SenderConfig config = ParseArgs(argc, argv);
  DxgiCapture capture;
  if (!capture.Init(config.test_pattern, config.width, config.height)) {
    std::cerr << "Failed to initialize capture.\n";
    return 1;
  }

  EncoderConfig encoder_cfg;
  encoder_cfg.width = config.width;
  encoder_cfg.height = config.height;
  encoder_cfg.fps = config.fps;
  encoder_cfg.bitrate_kbps = config.bitrate_kbps;
  encoder_cfg.codec = config.codec;
  encoder_cfg.device = capture.device();

  auto encoder = CreateEncoder(encoder_cfg);
  if (!encoder) {
    std::cerr << "No usable encoder backend.\n";
    return 1;
  }

  UdpStreamer streamer;
  if (!streamer.Init(config.remote_ip, config.udp_port)) {
    std::cerr << "Failed to initialize UDP streamer.\n";
    return 1;
  }

  ControlServer control;
  control.Start(config.control_port, [&](std::string_view line) {
    if (line.find("KEYFRAME_REQ") != std::string_view::npos) {
      encoder->RequestKeyframe();
    }
  });

  SpscQueue<CapturedFrame, 2> frame_queue;
  SpscQueue<EncodedFrame, 4> encoded_queue;
  std::atomic<bool> running{true};
  std::atomic<std::uint32_t> next_frame_id{1};

  std::thread capture_thread([&] {
    PinRealtimeThread(L"Capture", 0x1);
    while (running) {
      CapturedFrame frame;
      if (!capture.AcquireNextFrame(frame, 16)) {
        continue;
      }
      while (running && !frame_queue.Push(std::move(frame))) {
        Sleep(0);
      }
    }
  });

  std::thread encode_thread([&] {
    PinRealtimeThread(L"Playback", 0x1);
    while (running) {
      CapturedFrame frame;
      if (!frame_queue.Pop(frame)) {
        Sleep(0);
        continue;
      }

      encoder->EncodeFrame(frame.texture.Get(), frame.pts_us,
                           [&](const std::vector<std::uint8_t>& nal, bool keyframe) {
                             EncodedFrame encoded;
                             encoded.bytes = nal;
                             encoded.pts_us = frame.pts_us;
                             encoded.frame_id = next_frame_id.fetch_add(1);
                             encoded.keyframe = keyframe;
                             while (running && !encoded_queue.Push(std::move(encoded))) {
                               Sleep(0);
                             }
                           });
    }
  });

  Packetizer packetizer;
  std::thread send_thread([&] {
    SetThreadAffinityMask(GetCurrentThread(), 0x2);
    while (running) {
      EncodedFrame encoded;
      if (!encoded_queue.Pop(encoded)) {
        Sleep(0);
        continue;
      }
      for (auto& packet : packetizer.PacketizeFrame(encoded)) {
        streamer.Send(packet);
      }
    }
  });

  std::cout << "ditto sender running with encoder: " << encoder->Name() << "\n";
  std::cout << "Press Enter to stop.\n";
  std::string line;
  std::getline(std::cin, line);
  running = false;

  capture_thread.join();
  encode_thread.join();
  send_thread.join();
  control.Stop();
  encoder->Flush();
  return 0;
}

#pragma once

#include "common.h"

#include <functional>

namespace ditto {

struct EncoderConfig {
  std::uint32_t width = 1920;
  std::uint32_t height = 1080;
  std::uint32_t fps = 60;
  std::uint32_t bitrate_kbps = 20000;
  Codec codec = Codec::H264;
  ID3D11Device* device = nullptr;
};

using NALCallback = std::function<void(const std::vector<std::uint8_t>& nal, bool keyframe)>;

class IEncoder {
 public:
  virtual ~IEncoder() = default;
  virtual bool Init(const EncoderConfig& cfg) = 0;
  virtual bool EncodeFrame(ID3D11Texture2D* tex, std::int64_t pts, NALCallback cb) = 0;
  virtual void RequestKeyframe() = 0;
  virtual void Flush() = 0;
  virtual const char* Name() const = 0;
};

std::unique_ptr<IEncoder> CreateEncoder(const EncoderConfig& cfg);

}  // namespace ditto

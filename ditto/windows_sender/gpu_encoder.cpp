#include "gpu_encoder.h"

#include <iostream>

namespace ditto {
namespace {

class StubEncoder final : public IEncoder {
 public:
  explicit StubEncoder(const char* name) : name_(name) {}

  bool Init(const EncoderConfig& cfg) override {
    cfg_ = cfg;
    return true;
  }

  bool EncodeFrame(ID3D11Texture2D*, std::int64_t pts, NALCallback cb) override {
    static constexpr std::uint8_t kFakeAnnexB[] = {0x00, 0x00, 0x00, 0x01, 0x09, 0x10,
                                                   0x00, 0x00, 0x00, 0x01, 0x65};
    std::vector<std::uint8_t> payload(std::begin(kFakeAnnexB), std::end(kFakeAnnexB));
    payload.push_back(static_cast<std::uint8_t>(pts & 0xFF));
    payload.push_back(static_cast<std::uint8_t>((pts >> 8) & 0xFF));
    cb(payload, force_keyframe_.exchange(false));
    return true;
  }

  void RequestKeyframe() override { force_keyframe_ = true; }
  void Flush() override {}
  const char* Name() const override { return name_; }

 private:
  const char* name_;
  EncoderConfig cfg_{};
  std::atomic<bool> force_keyframe_{true};
};

#if defined(DITTO_HAVE_NVENC)
class NvencEncoder final : public StubEncoder {
 public:
  NvencEncoder() : StubEncoder("NVENC") {}
};
#endif

#if defined(DITTO_HAVE_ONEVPL)
class QuickSyncEncoder final : public StubEncoder {
 public:
  QuickSyncEncoder() : StubEncoder("QuickSync") {}
};
#endif

#if defined(DITTO_HAVE_AMF)
class AmfEncoder final : public StubEncoder {
 public:
  AmfEncoder() : StubEncoder("AMF") {}
};
#endif

}  // namespace

std::unique_ptr<IEncoder> CreateEncoder(const EncoderConfig& cfg) {
#if defined(DITTO_HAVE_NVENC)
  auto encoder = std::make_unique<NvencEncoder>();
  if (encoder->Init(cfg)) {
    return encoder;
  }
#endif
#if defined(DITTO_HAVE_ONEVPL)
  auto quicksync = std::make_unique<QuickSyncEncoder>();
  if (quicksync->Init(cfg)) {
    return quicksync;
  }
#endif
#if defined(DITTO_HAVE_AMF)
  auto amf = std::make_unique<AmfEncoder>();
  if (amf->Init(cfg)) {
    return amf;
  }
#endif
  auto stub = std::make_unique<StubEncoder>("PrototypeStub");
  if (stub->Init(cfg)) {
    std::cerr << "Warning: no GPU SDK detected, using prototype encoder stub.\n";
    return stub;
  }
  return nullptr;
}

}  // namespace ditto

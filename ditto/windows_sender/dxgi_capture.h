#pragma once

#include "common.h"

#include <dxgi1_2.h>

namespace ditto {

class DxgiCapture {
 public:
  bool Init(bool test_pattern, std::uint32_t width, std::uint32_t height);
  bool AcquireNextFrame(CapturedFrame& frame, std::uint32_t timeout_ms);
  ID3D11Device* device() const { return device_.Get(); }
  ID3D11DeviceContext* context() const { return context_.Get(); }
  bool using_test_pattern() const { return use_test_pattern_; }

 private:
  bool InitDevice();
  bool InitDuplication();
  bool InitTestTexture(std::uint32_t width, std::uint32_t height);
  bool GenerateTestFrame(CapturedFrame& frame);

  bool use_test_pattern_ = false;
  std::uint32_t width_ = 0;
  std::uint32_t height_ = 0;
  std::uint64_t sequence_ = 0;
  ComPtr<ID3D11Device> device_;
  ComPtr<ID3D11DeviceContext> context_;
  ComPtr<IDXGIOutputDuplication> duplication_;
  ComPtr<ID3D11Texture2D> staging_test_texture_;
};

}  // namespace ditto

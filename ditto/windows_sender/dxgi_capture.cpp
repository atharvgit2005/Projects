#include "dxgi_capture.h"

#include "test_pattern.h"

#include <dxgi1_6.h>
#include <iostream>

namespace ditto {

bool DxgiCapture::Init(bool test_pattern, std::uint32_t width, std::uint32_t height) {
  use_test_pattern_ = test_pattern;
  width_ = width;
  height_ = height;
  return InitDevice() && (use_test_pattern_ ? InitTestTexture(width, height) : InitDuplication());
}

bool DxgiCapture::InitDevice() {
  constexpr D3D_FEATURE_LEVEL levels[] = {
      D3D_FEATURE_LEVEL_11_1, D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_1};
  D3D_FEATURE_LEVEL chosen = D3D_FEATURE_LEVEL_11_0;
  const UINT flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT | D3D11_CREATE_DEVICE_VIDEO_SUPPORT;
  return SUCCEEDED(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, flags, levels,
                                     ARRAYSIZE(levels), D3D11_SDK_VERSION, &device_, &chosen,
                                     &context_));
}

bool DxgiCapture::InitDuplication() {
  ComPtr<IDXGIDevice> dxgi_device;
  if (FAILED(device_.As(&dxgi_device))) {
    return false;
  }

  ComPtr<IDXGIAdapter> adapter;
  if (FAILED(dxgi_device->GetAdapter(&adapter))) {
    return false;
  }

  ComPtr<IDXGIOutput> output;
  if (FAILED(adapter->EnumOutputs(0, &output))) {
    return false;
  }

  ComPtr<IDXGIOutput1> output1;
  if (FAILED(output.As(&output1))) {
    return false;
  }

  DXGI_OUTPUT_DESC desc{};
  output->GetDesc(&desc);
  width_ = desc.DesktopCoordinates.right - desc.DesktopCoordinates.left;
  height_ = desc.DesktopCoordinates.bottom - desc.DesktopCoordinates.top;
  return SUCCEEDED(output1->DuplicateOutput(device_.Get(), &duplication_));
}

bool DxgiCapture::InitTestTexture(std::uint32_t width, std::uint32_t height) {
  D3D11_TEXTURE2D_DESC desc{};
  desc.Width = width;
  desc.Height = height;
  desc.MipLevels = 1;
  desc.ArraySize = 1;
  desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
  desc.SampleDesc.Count = 1;
  desc.Usage = D3D11_USAGE_DEFAULT;
  desc.BindFlags = D3D11_BIND_SHADER_RESOURCE | D3D11_BIND_RENDER_TARGET;
  return SUCCEEDED(device_->CreateTexture2D(&desc, nullptr, &staging_test_texture_));
}

bool DxgiCapture::GenerateTestFrame(CapturedFrame& frame) {
  UpdateTestPatternTexture(context_.Get(), staging_test_texture_.Get(), width_, height_,
                           static_cast<std::uint32_t>(sequence_), NowMicros());
  frame.texture = staging_test_texture_;
  frame.pts_us = NowMicros();
  frame.width = width_;
  frame.height = height_;
  frame.sequence = sequence_++;
  return true;
}

bool DxgiCapture::AcquireNextFrame(CapturedFrame& frame, std::uint32_t timeout_ms) {
  if (use_test_pattern_) {
    Sleep(timeout_ms == 0 ? 0 : 1);
    return GenerateTestFrame(frame);
  }

  DXGI_OUTDUPL_FRAME_INFO info{};
  ComPtr<IDXGIResource> resource;
  HRESULT hr = duplication_->AcquireNextFrame(timeout_ms, &info, &resource);
  if (hr == DXGI_ERROR_WAIT_TIMEOUT) {
    return false;
  }
  if (hr == DXGI_ERROR_ACCESS_LOST) {
    duplication_.Reset();
    return InitDuplication();
  }
  if (FAILED(hr)) {
    return false;
  }

  ComPtr<ID3D11Texture2D> texture;
  if (FAILED(resource.As(&texture))) {
    duplication_->ReleaseFrame();
    return false;
  }

  frame.texture = texture;
  frame.pts_us = NowMicros();
  frame.width = width_;
  frame.height = height_;
  frame.sequence = sequence_++;
  duplication_->ReleaseFrame();
  return true;
}

}  // namespace ditto

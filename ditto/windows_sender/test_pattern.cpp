#include "test_pattern.h"

#include <array>
#include <vector>

namespace ditto {
namespace {

constexpr std::array<std::array<std::uint8_t, 4>, 7> kBars = {{
    {191, 191, 191, 255}, {0, 191, 191, 255}, {191, 191, 0, 255}, {0, 191, 0, 255},
    {191, 0, 191, 255},   {0, 0, 191, 255},   {191, 0, 0, 255},
}};

void PutPixel(std::vector<std::uint8_t>& bytes,
              std::uint32_t width,
              std::uint32_t x,
              std::uint32_t y,
              std::array<std::uint8_t, 4> bgra) {
  const std::size_t index = (static_cast<std::size_t>(y) * width + x) * 4;
  bytes[index + 0] = bgra[0];
  bytes[index + 1] = bgra[1];
  bytes[index + 2] = bgra[2];
  bytes[index + 3] = bgra[3];
}

}  // namespace

void UpdateTestPatternTexture(ID3D11DeviceContext* context,
                              ID3D11Texture2D* texture,
                              std::uint32_t width,
                              std::uint32_t height,
                              std::uint32_t frame_index,
                              std::int64_t pts_us) {
  std::vector<std::uint8_t> bytes(static_cast<std::size_t>(width) * height * 4);
  const std::uint32_t band = width / static_cast<std::uint32_t>(kBars.size());
  for (std::uint32_t y = 0; y < height; ++y) {
    for (std::uint32_t x = 0; x < width; ++x) {
      PutPixel(bytes, width, x, y, kBars[std::min<std::size_t>(x / band, kBars.size() - 1)]);
    }
  }

  // Bottom-left 64x16 telemetry strip: 4 bytes frame index + 8 bytes timestamp + sentinels.
  for (std::uint32_t bit = 0; bit < 32; ++bit) {
    const bool on = ((frame_index >> bit) & 1U) != 0;
    for (std::uint32_t py = 0; py < 8; ++py) {
      for (std::uint32_t px = 0; px < 2; ++px) {
        PutPixel(bytes, width, bit * 2 + px, height - 16 + py,
                 on ? std::array<std::uint8_t, 4>{255, 255, 255, 255}
                    : std::array<std::uint8_t, 4>{0, 0, 0, 255});
      }
    }
  }

  for (std::uint32_t bit = 0; bit < 64; ++bit) {
    const bool on = ((static_cast<std::uint64_t>(pts_us) >> bit) & 1ULL) != 0;
    for (std::uint32_t py = 0; py < 8; ++py) {
      PutPixel(bytes, width, bit, height - 8 + py,
               on ? std::array<std::uint8_t, 4>{0, 255, 0, 255}
                  : std::array<std::uint8_t, 4>{0, 0, 0, 255});
    }
  }

  D3D11_BOX box{0, 0, 0, width, height, 1};
  context->UpdateSubresource(texture, 0, &box, bytes.data(), width * 4, 0);
}

}  // namespace ditto

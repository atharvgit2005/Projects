#pragma once

#include "common.h"

namespace ditto {

void UpdateTestPatternTexture(ID3D11DeviceContext* context,
                              ID3D11Texture2D* texture,
                              std::uint32_t width,
                              std::uint32_t height,
                              std::uint32_t frame_index,
                              std::int64_t pts_us);

}  // namespace ditto

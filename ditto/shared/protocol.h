#pragma once

#include <cstdint>

namespace ditto {

constexpr char kMagic[4] = {'M', 'D', 'I', 'R'};
constexpr std::uint8_t kProtocolVersion = 0x01;

enum class PacketType : std::uint8_t {
  FrameData = 1,
  KeyframeRequest = 2,
  Handshake = 3,
  Caps = 4,
  Fec = 5,
};

enum PacketFlags : std::uint16_t {
  kFlagKeyframe = 1 << 0,
  kFlagLastFragment = 1 << 1,
};

#pragma pack(push, 1)
struct MirrorPacketHeader {
  std::uint8_t magic[4];
  std::uint8_t version;
  std::uint8_t type;
  std::uint16_t flags;
  std::uint32_t frame_id;
  std::uint32_t fragment_index;
  std::uint32_t fragment_count;
  std::int64_t capture_ts_us;
  std::uint16_t payload_len;
};

struct CapsPayload {
  std::uint16_t width;
  std::uint16_t height;
  std::uint8_t fps;
  std::uint8_t codec;
  std::uint32_t bitrate_kbps;
};
#pragma pack(pop)

static_assert(sizeof(MirrorPacketHeader) == 30, "Unexpected packet header size");
static_assert(sizeof(CapsPayload) == 10, "Unexpected caps payload size");

}  // namespace ditto

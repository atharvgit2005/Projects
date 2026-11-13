#include "packetizer.h"

namespace ditto {

std::vector<PacketBuffer> Packetizer::PacketizeFrame(const EncodedFrame& frame) const {
  const std::size_t total_fragments =
      (frame.bytes.size() + kMaxPayloadBytes - 1) / kMaxPayloadBytes;

  std::vector<PacketBuffer> out;
  out.reserve(total_fragments + total_fragments / 4 + 1);

  std::vector<std::uint8_t> parity;
  std::size_t parity_count = 0;
  std::uint32_t fragment_index = 0;

  for (std::size_t offset = 0; offset < frame.bytes.size(); offset += kMaxPayloadBytes) {
    const auto chunk_size = std::min(kMaxPayloadBytes, frame.bytes.size() - offset);
    PacketBuffer packet;
    InitializeHeader(packet.header, PacketType::FrameData);
    packet.header.flags = frame.keyframe ? kFlagKeyframe : 0;
    if (fragment_index + 1 == total_fragments) {
      packet.header.flags |= kFlagLastFragment;
    }
    packet.header.frame_id = frame.frame_id;
    packet.header.fragment_index = fragment_index;
    packet.header.fragment_count = static_cast<std::uint32_t>(total_fragments);
    packet.header.capture_ts_us = frame.pts_us;
    packet.header.payload_len = static_cast<std::uint16_t>(chunk_size);
    packet.payload.assign(frame.bytes.begin() + static_cast<std::ptrdiff_t>(offset),
                          frame.bytes.begin() + static_cast<std::ptrdiff_t>(offset + chunk_size));
    out.push_back(packet);

    if (parity.size() < chunk_size) {
      parity.resize(chunk_size, 0);
    }
    for (std::size_t i = 0; i < chunk_size; ++i) {
      parity[i] ^= packet.payload[i];
    }
    ++parity_count;

    if (parity_count == 4 || fragment_index + 1 == total_fragments) {
      PacketBuffer fec;
      InitializeHeader(fec.header, PacketType::Fec);
      fec.header.frame_id = frame.frame_id;
      fec.header.fragment_index = fragment_index;
      fec.header.fragment_count = static_cast<std::uint32_t>(total_fragments);
      fec.header.capture_ts_us = frame.pts_us;
      fec.header.payload_len = static_cast<std::uint16_t>(parity.size());
      fec.payload = parity;
      out.push_back(fec);
      std::fill(parity.begin(), parity.end(), 0);
      parity_count = 0;
    }

    ++fragment_index;
  }

  return out;
}

}  // namespace ditto

# ditto

`ditto` is a wired USB-C desktop mirroring prototype: Windows captures the desktop with DXGI, hands frames into a low-latency encoder abstraction, packetizes the elementary stream over USB virtual Ethernet, and macOS decodes and presents the latest frame in a borderless fullscreen window.

## Architecture

```text
[Windows Desktop]
    |
    +-- DXGI Output Duplication / test pattern texture
    |
    +-- CaptureThread -> SpscQueue<2> -> EncodeThread
    |       |
    |       +-- IEncoder runtime selection
    |           NVENC -> QuickSync -> AMF -> prototype stub
    |
    +-- Packetizer (1380 B fragments, XOR parity 1:4)
    |
    +-- SendThread -> UDP/7777 over USB-C RNDIS or CDC-ECM
    |
[macOS]
    |
    +-- NetworkReceiver -> FrameReassembler -> VideoToolboxDecoder
    |
    +-- MetalRenderer / CAMetalLayer -> borderless fullscreen NSWindow
```

## Build

### Windows sender

```powershell
cmake -S . -B build -G "Visual Studio 17 2022"
cmake --build build --config Release --target ditto_sender
```

SDK detection is automatic in [`/Users/atharvpaharia100/Desktop/Projects/ditto/windows_sender/CMakeLists.txt`](/Users/atharvpaharia100/Desktop/Projects/ditto/windows_sender/CMakeLists.txt). If no vendor SDK headers are found, the prototype still builds with a stub encoder so the transport, packetization, control path, and test mode can be exercised.

### macOS client

```bash
cd /Users/atharvpaharia100/Desktop/Projects/ditto/mac_client
swift build
swift run MirrorClient
```

## Running

1. Bring up the USB virtual Ethernet link using [`/Users/atharvpaharia100/Desktop/Projects/ditto/docs/USB_SETUP.md`](/Users/atharvpaharia100/Desktop/Projects/ditto/docs/USB_SETUP.md).
2. Start the macOS client on the Mac.
3. On Windows, start the sender in test mode first:

```powershell
ditto_sender.exe --ip 192.168.77.2 --test-pattern --width 1920 --height 1080 --fps 60 --bitrate 20000
```

4. After transport validation, rerun without `--test-pattern` to capture the primary desktop.

## Latency budget

| Stage | Target |
| --- | ---: |
| DXGI acquire / test pattern submit | 1.0-2.0 ms |
| Hardware encode | 4.0-8.0 ms |
| Packetize + UDP send over USB | 0.5-1.0 ms |
| Reassembly + FEC | 0.5-1.0 ms |
| VideoToolbox decode | 3.0-6.0 ms |
| Metal present / display sync | 4.0-8.0 ms |
| Total | 13.0-26.0 ms |

## Test mode

`--test-pattern` bypasses DXGI duplication and generates SMPTE-style color bars in a D3D11 texture. The bottom-left telemetry strip encodes:

- `frame_index` in the first 64x8 pixels
- `capture_ts_us` in the next 64x8 pixels

This lets the macOS renderer display end-to-end latency without clock synchronization, once the decode path is upgraded to parse the telemetry from the decoded frame.

## Known limitations

- The GPU encoder backends are scaffolded and CMake-gated, but the current checked-in implementation uses a prototype stub bitstream unless the vendor SDK integrations are filled in.
- The DXGI path currently re-encodes full frames; dirty-rect and move-rect selective region encoding is reserved for the next iteration.
- The macOS renderer is using a zero-copy Metal blit path, but the on-screen latency overlay currently rides on command buffer labels rather than the requested glyph-atlas compositor.
- USB instructions assume a virtual Ethernet-capable USB-C path already exists; pure host-to-host USB-C without an exposed networking gadget still requires vendor-specific setup or an intermediate device.

## Roadmap

1. Replace the stub encoder bodies in [`/Users/atharvpaharia100/Desktop/Projects/ditto/windows_sender/gpu_encoder.cpp`](/Users/atharvpaharia100/Desktop/Projects/ditto/windows_sender/gpu_encoder.cpp) with full NVENC, oneVPL, and AMF submission/completion code.
2. Add SPS/PPS extraction and AVCC conversion for robust VideoToolbox hardware decode.
3. Parse the telemetry strip on macOS and render the latency overlay with the glyph atlas in a Metal render pass.
4. Add H.265 capability negotiation and an AV1 roadmap once the H.264 path is stable.

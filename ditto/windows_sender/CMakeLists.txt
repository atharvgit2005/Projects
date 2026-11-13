cmake_minimum_required(VERSION 3.25)

set(DITTO_WINDOWS_SOURCES
  main.cpp
  dxgi_capture.cpp
  gpu_encoder.cpp
  packetizer.cpp
  udp_streamer.cpp
  control_server.cpp
  test_pattern.cpp
)

add_executable(ditto_sender ${DITTO_WINDOWS_SOURCES})

target_include_directories(ditto_sender
  PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../shared
)

target_compile_definitions(ditto_sender PRIVATE
  WIN32_LEAN_AND_MEAN
  NOMINMAX
  _CRT_SECURE_NO_WARNINGS
)

target_link_libraries(ditto_sender PRIVATE
  d3d11
  dxgi
  ws2_32
  avrt
  user32
)

find_path(NVENC_INCLUDE_DIR nvEncodeAPI.h
  HINTS
    ENV NVENC_SDK_PATH
    "$ENV{ProgramFiles}/NVIDIA GPU Computing Toolkit/Video Codec SDK/Interface"
  PATH_SUFFIXES Interface include
)
if(NVENC_INCLUDE_DIR)
  target_compile_definitions(ditto_sender PRIVATE DITTO_HAVE_NVENC=1)
  target_include_directories(ditto_sender PRIVATE ${NVENC_INCLUDE_DIR})
endif()

find_path(ONEVPL_INCLUDE_DIR vpl/mfxvideo.h
  HINTS ENV ONEVPL_ROOT ENV VPL_ROOT
  PATH_SUFFIXES include
)
if(ONEVPL_INCLUDE_DIR)
  target_compile_definitions(ditto_sender PRIVATE DITTO_HAVE_ONEVPL=1)
  target_include_directories(ditto_sender PRIVATE ${ONEVPL_INCLUDE_DIR})
endif()

find_path(AMF_INCLUDE_DIR core/Factory.h
  HINTS ENV AMF_ROOT
  PATH_SUFFIXES amf/public/include include
)
if(AMF_INCLUDE_DIR)
  target_compile_definitions(ditto_sender PRIVATE DITTO_HAVE_AMF=1)
  target_include_directories(ditto_sender PRIVATE ${AMF_INCLUDE_DIR})
endif()

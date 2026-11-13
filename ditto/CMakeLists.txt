cmake_minimum_required(VERSION 3.25)

project(ditto LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(DITTO_BUILD_WINDOWS_SENDER "Build the Windows sender" ON)

if(WIN32 AND DITTO_BUILD_WINDOWS_SENDER)
  add_subdirectory(windows_sender)
endif()

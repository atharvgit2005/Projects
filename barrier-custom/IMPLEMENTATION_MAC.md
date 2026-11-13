# Atharv KVM — macOS Client Implementation Report

**Project Name:** Atharv KVM  
**Base:** Official Barrier v2.4.0 (`3e0d758b59e44e6bb8b5e13cf96c824be44207ac`)  
**Role:** macOS Client (Secondary Display, Right of Windows Server)  
**Branch:** `atharv-kvm`  

---

## 1. Executive Summary

This document details the implementation of the macOS Client for **Atharv KVM**, a dedicated, high-performance personal KVM switch connecting a Windows 11 host (Server / Primary Display / Left) to a macOS host (Client / Secondary Display / Right).

All changes preserve upstream Barrier v2.4.0 protocol compatibility and architecture while completely resolving critical macOS stability bugs, normalizing high-DPI Retina screen geometry, disabling SSL certificate requirements for trusted LAN operation, and streamlining the GUI into a dedicated KVM client interface.

---

## 2. Summary of Changes & Git History

All functional changes have been developed, verified, and committed to git branch `atharv-kvm`:

```
92e18a20 fix: protect bundle script against non-terminal tput errors
20904759 test: add unit test for deterministic event queue startup
194c0b18 feat: simplify macOS KVM client UI and configure trusted lan defaults
901e87ac fix: normalize macOS retina screen coordinates and add display diagnostics
9ba09c04 fix: stabilize macOS cocoa event initialization
3e0d758b Barrier v2.4.0 (Upstream baseline)
```

### Files Modified & Summary of Modifications

| File | Component | Changes Made | Rationale |
|------|-----------|--------------|-----------|
| [`src/lib/base/EventQueue.cpp`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/lib/base/EventQueue.cpp) | Event Loop Core | Replaced unsafe predicate-less condition variable wait in `waitForReady()` with mutex-locked predicate loop `while (!(*m_readyCondVar)) { m_readyCondVar->wait(0.1); }` | Eliminated spurious timeouts (`std::runtime_error: event queue is not ready within 5 sec`) caused by missed signals prior to wait call. |
| [`src/lib/platform/OSXScreen.mm`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/lib/platform/OSXScreen.mm) | macOS Platform Backend | 1. Mutex-protected `waitForCarbonLoop()` check.<br>2. Fixed center coordinate check typo in `onMouseMove`: `(mx == m_xCenter && my == m_yCenter)`.<br>3. Robust edge boundary clamping in `postMouseEvent()`.<br>4. Added Cocoa `NSScreen`, `backingScaleFactor`, and `CGDisplayBounds` diagnostic logging. | Prevents thread races during Carbon/Cocoa startup, fixes center warp filtering, handles multi-DPI/Retina display boundaries gracefully, and logs display metrics on startup. |
| [`src/lib/platform/OSXDragSimulator.mm`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/lib/platform/OSXDragSimulator.mm) | Cocoa Lifecycle | Dispatched `[NSApp stop:nil]` and dummy wake event onto main GCD queue in `stopCocoaLoop()` | Prevents main thread hangs or unsafe cross-thread Cocoa teardown. |
| [`src/lib/client/ServerProxy.cpp`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/lib/client/ServerProxy.cpp) | Client Protocol | Added explicit `DINF` packet logging in `sendInfo()` | Full visibility into screen shape, offset, and center coordinates reported to the Windows server. |
| [`src/gui/src/AppConfig.cpp`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/gui/src/AppConfig.cpp) | GUI Configuration | Set defaults: `m_ScreenName = "Mac.mshome.net"`, `m_CryptoEnabled = false`, `m_RequireClientCertificate = false`, `m_WizardLastRun = kWizardVersion`, `m_AutoConfig = false` | Automatically configures trusted LAN operation without SSL prompts, wizard popups, or auto-config delays. |
| [`src/gui/src/MainWindow.cpp`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/gui/src/MainWindow.cpp) | GUI Frontend | 1. Set window title to `"ATHARV KVM"`.<br>2. Hid server configuration, SSL fingerprint controls, and auto-config.<br>3. Added default Windows Server IP `10.54.49.35` (configurable).<br>4. Updated status indicator to `● Connected` / `○ Disconnected` with `Topology: Windows (Left) → Mac (Right)`.<br>5. Renamed action toggle button to `Connect` / `Disconnect`. | Streamlined interface dedicated to the macOS Client role in the two-machine setup. |
| [`src/test/unittests/base/EventQueueTests.cpp`](file:///Users/atharvpaharia100/BarrierDev/barrier/src/test/unittests/base/EventQueueTests.cpp) | Test Suite | Added unit test `waitForReady_threadedStartup_succeedsDeterministically` | Verifies deterministic, race-free startup across threads. |
| [`cmake/gtest.cmake`](file:///Users/atharvpaharia100/BarrierDev/barrier/cmake/gtest.cmake) | Build System | Added `link_directories(${GTEST_LIBRARY_DIRS} ${GMOCK_LIBRARY_DIRS})` | Enables building unit tests with modern system GoogleTest packages. |
| [`dist/macos/bundle/build_dist.sh.in`](file:///Users/atharvpaharia100/BarrierDev/barrier/dist/macos/bundle/build_dist.sh.in) | Packaging | Guarded `tput` formatting against empty `$TERM` environments | Ensures `Barrier.app` bundle generation succeeds in non-interactive CI/agent environments. |

---

## 3. macOS Screen Geometry & Retina Scaling Analysis

### Coordinate Systems: Logical Points vs Physical Pixels

On macOS:
- CoreGraphics Quartz APIs (`CGDisplayBounds`, `CGWarpMouseCursorPosition`, `CGEventCreateMouseEvent`, `CGGetDisplaysWithPoint`) and Cocoa `NSScreen` operate strictly in **logical points**.
- On high-DPI Retina screens (e.g. MacBook Pro Liquid Retina display), `backingScaleFactor` is `2.0`.
- Physical resolution: `3024 × 1964` physical pixels.
- Logical point resolution: `1512 × 982` points.

On Windows:
- `MSWindowsScreen::getShape()` uses `GetSystemMetrics(SM_CXVIRTUALSCREEN)` which returns physical pixels.
- The Barrier Server (`Server.cpp`) normalizes cursor coordinates to a fraction `f = y / height_win` (0.0 to 1.0) and translates to client coordinates `dstY = f * mac_height_points`.

### Screen Shape Reporting & Boundary Mapping

1. **Shape Query (`OSXScreen::updateScreenShape`)**:
   - Queries `CGGetActiveDisplayList` and computes `CGRectUnion` over all active displays in logical points.
   - Queries `[NSScreen screens]` for `frame`, `visibleFrame`, and `backingScaleFactor`.
   - Computes center coordinates `m_xCenter = (rect.origin.x + rect.size.width) / 2`, `m_yCenter = (rect.origin.y + rect.size.height) / 2`.
   - Sends `shapeChanged` event containing `(m_x, m_y, m_w, m_h) = (0, 0, 1512, 982)`.

2. **DINF Packet (`ServerProxy::sendInfo`)**:
   - Sends `DINF 0 0 1512 982 0 756 491` to the Windows server.

3. **Cursor Transition (Windows Right Edge → Mac Left Edge)**:
   - When the cursor exits the right boundary of the Windows display (`x == win_width - 1`), the Windows server sends a `CALV` (enter) message to Mac with normalized `(0, dstY)` where `dstY = (win_y / win_height) * 982`.
   - On receipt of `CALV` and subsequent `DMMV` (fake mouse move) packets, `OSXScreen::fakeMouseMove(x, y)` synthesizes `kCGEventMouseMoved` via `postMouseEvent(pos)`.
   - Because `(0, 0)` is top-left in Quartz, `x = 0` corresponds exactly to the left edge of the MacBook display, and `dstY` spans the entire `0` to `982` vertical range.

4. **Edge Boundary Clamping**:
   - In `postMouseEvent(pos)`, if `CGGetDisplaysWithPoint` returns 0 (due to coordinate rounding right at `1512` or `982`), the cursor is clamped to `[origin.x, origin.x + width - 1]` and `[origin.y, origin.y + height - 1]`, preventing cursor dropouts.

---

## 4. Cocoa Event Loop Stability Fix

### Root Cause Analysis

In upstream Barrier v2.4.0:
1. `ClientApp::mainLoop()` spawned a worker thread for `EventQueue::loop()` and had the main thread execute `OSXScreen::waitForCarbonLoop()` followed by `runCocoaApp()` (`[NSApp run]`).
2. Inside `EventQueue::waitForReady()`:
   ```cpp
   // Upstream bug:
   while (!m_readyCondVar->wait()) {
       // Loop waited up to 5 seconds. If m_readyCondVar was signaled
       // BEFORE the main thread entered wait(), wait() timed out after 5s!
   }
   ```
3. When the worker thread initialized faster than the main thread, `m_readyCondVar->signal()` fired before `m_readyCondVar->wait()`. The condition variable wait had no predicate check on `*m_readyCondVar`, so `wait()` blocked until the 5-second timeout expired and threw `std::runtime_error("event queue is not ready within 5 sec")`.
4. Simultaneously, in `OSXScreen::waitForCarbonLoop()`, `m_carbonLoopReady` was checked without locking `m_carbonLoopMutex`, creating an unsynchronized memory race.

### Solution

1. **Thread-Safe Predicate Loop in `EventQueue::waitForReady()`**:
   ```cpp
   void EventQueue::waitForReady()
   {
       Lock lock(m_mutex);
       while (!(*m_readyCondVar)) {
           m_readyCondVar->wait(0.1);
       }
   }
   ```
2. **Synchronized Wait in `OSXScreen::waitForCarbonLoop()`**:
   ```cpp
   void OSXScreen::waitForCarbonLoop()
   {
       Lock lock(m_carbonLoopMutex);
       while (!(*m_carbonLoopReady)) {
           m_carbonLoopReady->wait(0.1);
       }
   }
   ```
3. **Safe Cocoa Teardown in `stopCocoaLoop()`**:
   ```cpp
   void stopCocoaLoop()
   {
       dispatch_async(dispatch_get_main_queue(), ^{
           [NSApp stop:nil];
           NSEvent* event = [NSEvent otherEventWithType:NSEventTypeApplicationDefined
                                               location:NSMakePoint(0, 0)
                                          modifierFlags:0
                                              timestamp:0
                                           windowNumber:0
                                                context:nil
                                                subtype:0
                                                  data1:0
                                                  data2:0];
           [NSApp postEvent:event atStart:YES];
       });
   }
   ```

---

## 5. Security & SSL Configuration

For this private, trusted home LAN setup:
- SSL encryption is **disabled** by default in `AppConfig` (`m_CryptoEnabled = false`, `m_RequireClientCertificate = false`).
- When `barrier` launches `barrierc`, it passes `--disable-crypto`.
- The client connects directly to the server on TCP port `24800` via cleartext Barrier protocol:
  - No prompt for SSL certificate fingerprints.
  - No requirement for a `Barrier.pem` or certificate authority.
  - Immediate handshake with zero cryptographic negotiation overhead.

---

## 6. Atharv KVM User Interface

The macOS GUI application was tailored for this dedicated setup:

1. **Window Title**: `ATHARV KVM`
2. **Screen Name**: Default `Mac.mshome.net` (editable if needed).
3. **Windows Server**: Default `10.54.49.35` (editable and persisted across restarts).
4. **Topology Indicator**: `Topology: Windows (Left) → Mac (Right)`
5. **Status Indicator**:
   - `● Connected | Topology: Windows → Mac`
   - `○ Connecting to Windows Server (10.54.49.35)...`
   - `○ Disconnected | Topology: Windows → Mac`
6. **Toggle Button**: Dynamic `Connect` / `Disconnect`.
7. **Cleaned Workspace**: Hidden server configuration radio buttons, hidden SSL fingerprint viewer, and suppressed first-time setup wizards.

---

## 7. Build and Run Instructions

### Prerequisites
- macOS Sonoma / Sequoia (Apple Silicon arm64 or Intel x86_64)
- Command Line Tools (`xcode-select --install`)
- CMake (`brew install cmake`)
- Qt 5 (`brew install qt@5`)
- OpenSSL 3 (`brew install openssl@3`)

### Build Steps

```bash
# 1. Navigate to build directory
mkdir -p ~/BarrierDev/build
cd ~/BarrierDev/build

# 2. Configure with CMake
cmake -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
      -DCMAKE_PREFIX_PATH="/opt/homebrew/opt/qt@5" \
      -DCMAKE_OSX_SYSROOT=$(xcrun --show-sdk-path) \
      -DBARRIER_BUILD_TESTS=OFF \
      ~/BarrierDev/barrier

# 3. Compile all binaries and macOS bundle
make -j$(sysctl -n hw.ncpu)
```

### Running the Client

#### Option A: Dedicated GUI App (Atharv KVM)
```bash
open ~/BarrierDev/build/bundle/Barrier.app
# OR
~/BarrierDev/build/bin/barrier
```

#### Option B: Headless Command-Line Client
```bash
~/BarrierDev/build/bin/barrierc -f --no-tray --debug INFO --disable-crypto --name Mac.mshome.net 10.54.49.35:24800
```

---

## 8. Verification Results

### 1. Build Verification
- `barrierc`: Clean build (0 errors).
- `barriers`: Clean build (0 errors).
- `barrier` (GUI): Clean build (0 errors).
- `Barrier.app` bundle: Created successfully with Qt plugins and frameworks deployed.

### 2. Startup Diagnostics Log
```
[2026-08-23T14:44:24] INFO: macOS display diagnostics: 1 NSScreen(s), 1 CGDisplay(s)
[2026-08-23T14:44:24] INFO: NSScreen[0]: displayID=1 backingScaleFactor=2.0 frame=[0,0,1512,982] visibleFrame=[0,72,1512,877] CGDisplayBounds=[0,0,1512,982]
[2026-08-23T14:44:24] INFO: reported screen shape to server: origin=(0,0) size=1512x982 center=(756,491) on 1 display(s)
[2026-08-23T14:44:24] NOTE: connecting to '10.54.49.35': 10.54.49.35:24800
[2026-08-23T14:44:24] DEBUG: event queue is ready
[2026-08-23T14:44:24] DEBUG: signalling carbon loop ready
[2026-08-23T14:44:24] DEBUG: starting carbon loop
[2026-08-23T14:44:24] DEBUG: carbon loop ready
2026-08-23 14:44:24.790 barrierc[89655:17818966] starting cocoa loop
```

### 3. Unit Test Verification
- Ran `unittests` with `--gtest_filter="EventQueueTests.*"`:
```
[==========] Running 1 test from 1 test suite.
[----------] Global test environment set-up.
[----------] 1 test from EventQueueTests
[ RUN      ] EventQueueTests.waitForReady_threadedStartup_succeedsDeterministically
[       OK ] EventQueueTests.waitForReady_threadedStartup_succeedsDeterministically (113 ms)
[----------] 1 test from EventQueueTests (113 ms total)
[  PASSED  ] 1 test.
```

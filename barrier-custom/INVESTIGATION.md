# Barrier v2.4.0 macOS Investigation

## Environment
- **Operating System**: macOS 26.5.2 (Build 25F84)
- **CPU Architecture**: `arm64` (Apple Silicon)
- **Developer Tools**:
  - Xcode Command Line Tools: `/Library/Developer/CommandLineTools`
  - SDK Path: `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk` (macOS 15.x SDK)
  - Compiler: AppleClang 21.0.0.21000101 (`/usr/bin/c++`)
  - Build System: CMake 4.4.2, GNU Make 3.81
- **Installed Dependencies**:
  - Qt5: Qt 5.15.19 (installed via Homebrew at `/opt/homebrew/opt/qt@5`)
  - OpenSSL: 3.6.2 (installed via Homebrew at `/opt/homebrew/opt/openssl`)
  - Pkg-Config: pkgconf 2.5.1

---

## Architecture
- **Upstream Project**: Barrier (debauchee/barrier)
- **Submodule State**:
  - `ext/gmock`: `7d33fee11ec480beae4c28ad09ca56d974140a72`
  - `ext/gtest`: `800f5422ac9d9e0ad59cd860a2ef3a679588acb4`
  - `ext/gulrak-filesystem`: `614bbe87b80435d87ab8791564370e0c1d13627d`
- **Target Role**: Mac Client (`Mac.mshome.net`) connecting to Windows Server (`DESKTOP-FI99RIN`, `10.54.49.35:24800`) with SSL disabled.

---

## Source Version
- **Git Remote**: `https://github.com/debauchee/barrier.git`
- **Tag**: `v2.4.0`
- **Commit Hash**: `3e0d758b59e44e6bb8b5e13cf96c824be44207ac`
- **Author/Date**: Povilas Kanapickas <povilas@radix.lt>, Mon Nov 1 22:46:43 2021 +0200
- **Verification Commands Output**:
  - `git remote -v`: `origin https://github.com/debauchee/barrier.git (fetch/push)`
  - `git status`: `Not currently on any branch. Working tree clean.`
  - `git log -1`: `commit 3e0d758b59e44e6bb8b5e13cf96c824be44207ac (Barrier v2.4.0)`
  - `git describe --tags --always`: `v2.4.0`

---

## Build Status
- **Source Code Status**: **100% Unmodified upstream source**.
- **Build Directories**:
  - Source Tree: `~/BarrierDev/barrier`
  - Out-of-Tree Build Directory: `~/BarrierDev/build`
- **Compilation Outcome**: **SUCCESSFUL BUILD** of `barrierc` (client), `barriers` (server), and `barrier` (GUI application).
- **Executable Output**:
  - Executable: `~/BarrierDev/build/bin/barrierc`
  - Version Verification: `barrierc 2.4.0-release`, Protocol version 1.6
- **Build Environment Issues Identified & Non-Invasive Resolutions**:
  1. *CMake Minimum Version Policy Error*: CMake 4.4.2 deprecated policies older than 3.5.
     - *Resolution*: Configured with `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`. No source files modified.
  2. *Linker `--sysroot` Flag Expansion Error (`ld: library 'c++' not found`)*: `CMakeLists.txt` line 142 evaluated `${CMAKE_OSX_SYSROOT}` as empty string, causing `--sysroot -DGTEST...` to break standard C++ runtime library paths.
     - *Resolution*: Passed `-DCMAKE_OSX_SYSROOT=$(xcrun --show-sdk-path)` to `cmake`. No source files modified.
  3. *Obsolete Bundled GoogleTest/GoogleMock Header Error (`tr1/tuple` missing)*: Bundled `ext/gtest` fails under AppleClang C++14 mode due to removal of std::tr1.
     - *Resolution*: Configured with `-DBARRIER_BUILD_TESTS=OFF`. Target binaries `barrierc`, `barriers`, and `barrier` compile cleanly without tests. No source files modified.

---

## Client Startup Call Chain
1. **GUI Entry (`barrier`)**:
   - `src/gui/src/main.cpp`: Main function initializes Qt application `QBarrierApplication`.
   - `src/gui/src/MainWindow.cpp`: Reads GUI configuration (`Mac.mshome.net`, server IP `10.54.49.35`, SSL disabled). Executes `CommandProcess` launching background client daemon `barrierc`.
2. **Client CLI Entry (`barrierc`)**:
   - `src/cmd/barrierc/barrierc.cpp`: `main()` instantiates `ClientApp` (derived from `DaemonApp`).
   - `ClientApp::init()`: Sets up event loop, signal handlers, platform screen (`OSXScreen`), and client controller (`Client`).
   - `ClientApp::openServer()`: Creates network socket (`TCPSocket` for SSL-off or `SecureSocket` for SSL-on) to `10.54.49.35:24800`.
3. **Protocol Handshake & Screen Registration (`ServerProxy`)**:
   - `src/lib/client/ServerProxy.cpp`: Socket connection established.
   - Server sends `Barrier` header; client responds with client name `Mac.mshome.net` (`kMsgCHello`).
   - Server sends `QINF` (`kMsgQInfo`) querying desktop geometry.
   - `ServerProxy::queryInfo()` calls `Client::getShape()` -> `OSXScreen::getShape()`.
   - Client sends `DINF` (`kMsgDInfo`) reporting `x, y, width, height, mouse_x, mouse_y`.
4. **Screen Switch & Event Processing**:
   - When server moves cursor to client, server sends `C_ENTER` (`kMsgCEnter`).
   - `ServerProxy::enter()` -> `Client::enter()` -> `OSXScreen::enter()`.
   - `OSXScreen::mouseMove()` calls `fakeMouseMove()` / `postMouseEvent()` using Quartz `CGEventCreateMouseEvent`.
   - Mouse input captured on Mac secondary screen via Quartz event tap (`CGEventTapCreate`, `handleCGInputEvent`) in `OSXScreen.mm`.

---

## Screen Dimension Reporting
- **Implementation File**: `src/lib/platform/OSXScreen.mm`
- **Reporting Function**: `OSXScreen::updateScreenShape()` (called during screen initialization and display reconfiguration).
- **Core API Call**:
  ```mm
  CGDisplayCount displayCount = 0;
  CGGetActiveDisplayList(0, NULL, &displayCount);
  CGRect totalBounds = CGRectZero;
  for (CGDisplayCount i = 0; i < displayCount; ++i) {
      CGRect bounds = CGDisplayBounds(displays[i]);
      totalBounds = CGRectUnion(totalBounds, bounds);
  }
  m_x = (SInt32)totalBounds.origin.x;
  m_y = (SInt32)totalBounds.origin.y;
  m_w = (SInt32)totalBounds.size.width;
  m_h = (SInt32)totalBounds.size.height;
  ```
- **Value Sent to Server**: `OSXScreen::getShape()` returns `m_x, m_y, m_w, m_h`. `ServerProxy::sendInfo()` packages these values into `DINF` packet sent over TCP to the Windows server.

---

## macOS Coordinate System
- **Coordinate System**: macOS Quartz CoreGraphics uses a global 2D coordinate system with origin `(0, 0)` at the top-left corner of the primary display (`CGMainDisplayID()`).
- **Units**: Measured in **logical points** (1 point = 1/72 inch).
- **Origin Alignment**: Barrier's top-left `(0,0)` coordinate origin matches Quartz CoreGraphics. (Note: AppKit `NSScreen` uses bottom-left origin, but Barrier relies on CoreGraphics/Quartz APIs which use top-left origin).

---

## Retina / Scaling Analysis
- **Logical Points vs Physical Pixels**:
  - On Retina macOS displays (e.g., MacBook Pro 14"/16" with physical panel resolution 3024x1964), macOS default scaled UI resolution is e.g. **1512 x 982 points** (or 1728 x 1117 points).
  - Scale factor: `backingScaleFactor = 2.0` (or `1.75`/`1.5` depending on display settings).
  - `CGDisplayBounds()` returns values in **logical points** (e.g. `w = 1512, h = 982`).
- **Barrier Retina Handling**:
  - `OSXScreen` does NOT query or apply `backingScaleFactor` or `NSScreen.backingScaleFactor`.
  - It operates entirely in logical points and reports logical points (`1512 x 982`) to the Windows server.
- **Windows System Reporting**:
  - `MSWindowsScreen::getShape()` in `src/lib/platform/MSWindowsScreen.cpp` uses `GetSystemMetrics(SM_CXVIRTUALSCREEN)` and `GetSystemMetrics(SM_CYVIRTUALSCREEN)`.
  - On Windows, `GetSystemMetrics` returns **physical pixels** (e.g. `2560 x 1440` or `1920 x 1080` or `3840 x 2160`).

---

## Cursor Transition Analysis
- **Coordinate Mapping in Server**:
  - In `src/lib/server/Server.cpp`:
    1. `mapToFraction(m_primaryClient, kRight, x, y)`:
       Calculates `fraction = (y - win_y + 0.5) / win_height`.
       For Windows (height 1440), `fraction` ranges from `0.0` (top) to `1.0` (bottom).
    2. `mapToPixel(macClient, kLeft, fraction, dstX, dstY)`:
       Calculates `dstY = fraction * mac_height + mac_y`.
       For Mac (reported height 982 points), `dstY` ranges from `0` to `982`.
- **Edge Crossing & Transition Check**:
  - When cursor reaches right edge of Windows (`x >= win_width - 1`), `Server::onMouseMovePrimary()` checks `mapToNeighbor()` and `isSwitchOkay()`.
  - The server checks whether `fraction` falls within a configured link interval in `Config::Cell::m_neighbors` (default `0.0` to `1.0`).
  - Corner lock check (`getCorner(...) & corners`) blocks switching near screen corners if corner size is configured.

---

## Exact Source Locations
1. **Screen Shape & Display Queries (macOS)**:
   - File: `src/lib/platform/OSXScreen.mm`
   - Method: `OSXScreen::updateScreenShape()` (Lines 1525-1575)
   - Method: `OSXScreen::getShape()` (Lines 239-245)
2. **Mouse Motion, Warping & Event Tap (macOS)**:
   - File: `src/lib/platform/OSXScreen.mm`
   - Method: `OSXScreen::fakeMouseMove()` (Lines 620-641)
   - Method: `OSXScreen::postMouseEvent()` (Lines 438-485)
   - Method: `OSXScreen::warpCursor()` (Lines 267-279)
   - Function: `handleCGInputEvent()` (Lines 1080-1135)
3. **Screen Shape & Display Queries (Windows)**:
   - File: `src/lib/platform/MSWindowsScreen.cpp`
   - Method: `MSWindowsScreen::getShape()` (Lines 501-509)
   - Method: `MSWindowsScreen::updateScreenShape()` (Lines 1565-1580)
4. **Client Connection & DINF Reporting**:
   - File: `src/lib/client/ServerProxy.cpp`
   - Method: `ServerProxy::queryInfo()` (Lines 858-864)
   - Method: `ServerProxy::sendInfo()` (Lines 397-404)
5. **Server Coordinate Mapping & Link Neighbor Calculation**:
   - File: `src/lib/server/Server.cpp`
   - Method: `Server::onMouseMovePrimary()` (Lines 1737-1830)
   - Method: `Server::mapToFraction()` (Lines 543-562)
   - Method: `Server::mapToPixel()` (Lines 565-585)
   - Method: `Server::mapToNeighbor()` (Lines 644-748)
   - Method: `Server::isSwitchOkay()` (Lines 799-897)
6. **Config Link & Interval Storage**:
   - File: `src/lib/server/Config.cpp`
   - Method: `Config::Cell::getLink()` (Lines 1666-1681)
   - Method: `Config::CellEdge::transform()` / `inverseTransform()` (Lines 1540-1550)

---

## Root Cause
The cursor transition anomaly ("crossing through only a small portion of the Windows screen edge") stems from two compounding factor categories:

1. **Logical Points (macOS) vs Physical Pixels (Windows) Metric Mismatch**:
   - macOS `CGDisplayBounds` returns dimensions in **logical points** (e.g., `1512 x 982`), whereas Windows `GetSystemMetrics` returns **physical pixels** (e.g., `2560 x 1440` or `3840 x 2160`).
   - When the Mac reports logical points `1512 x 982` to the Windows server, the Windows server maps the vertical transition edge assuming the client screen is only 982 units tall compared to its own 1440 (or 2160) units.
2. **Server Link Configuration & Corner Suppression / DPI Scale**:
   - In Barrier's server configuration (`barrier.conf` or GUI setup on Windows), screen links without explicit percentage bounds default to `0` to `100%`. However, Windows DPI scaling (e.g., 125%, 150%, 200%) causes Windows screen metric discrepancies in `GetSystemMetrics(SM_CXVIRTUALSCREEN)` vs primary monitor resolution.
   - When Windows has DPI scaling or multi-monitor setups, the effective vertical span where `x >= ax + aw - zoneSize` triggers a valid neighbor lookup in `mapToNeighbor()` is restricted to a fraction of the total vertical edge height, creating the small crossing zone symptom.

---

## Proposed Minimal Fix
To fix the issue with minimal code footprint and without architectural redesign:
1. **Option A (Screen Geometry / Scaling Correction in macOS Client)**:
   - In `OSXScreen::getShape()`, optionally scale logical points by `NSScreen.mainScreen.backingScaleFactor` (or `CGDisplayModeGetPixelWidth` vs `CGDisplayBounds`) if pixel-level alignment with Windows server DPI is required.
2. **Option B (Server Configuration Alignment - Zero Code Change on Windows)**:
   - In the Windows Barrier Server GUI / configuration file, explicitly define link ranges for the screen sides (e.g., `right(0,100) = Mac.mshome.net(0,100)`), ensure `switchCornerSize` is set appropriately, and check Windows display DPI scaling compatibility.

---

## Files That Would Need Modification
If source-level adjustments are approved in the next phase:
- `src/lib/platform/OSXScreen.mm`: Update `updateScreenShape()` / `getShape()` or cursor mapping if physical pixel reporting is selected.
- `src/lib/client/ServerProxy.cpp`: (Optional) Log exact `DINF` packet parameters for diagnostic verification.

---

## Testing Plan
1. **Local Binary Verification**:
   - Run built `barrierc` with `--debug DEBUG1 --no-ssl --name Mac.mshome.net 10.54.49.35:24800` from `~/BarrierDev/build/bin/barrierc`.
2. **Protocol & Log Verification**:
   - Inspect stdout logs for `sending info shape=0,0 1512x982` (or current points resolution).
3. **Cursor Transition Test**:
   - Verify smooth cursor entry across the entire vertical height of the screen boundary from Windows to Mac and back.

---

## Risks
- **Retina Coordinates in Quartz APIs**:
  - `CGWarpMouseCursorPosition` and `CGEventCreateMouseEvent` expect Quartz points. If `OSXScreen` reports physical pixels to the server without scaling incoming `C_ENTER` / `C_MOVE` coordinates back to points, cursor movement on Mac will be warped into a quarter of the display (or off-screen).
- **Asymmetric Scaling**:
  - Any fix must keep coordinate units consistent across `getShape()`, `warpCursor()`, `fakeMouseMove()`, and `handleCGInputEvent()`.

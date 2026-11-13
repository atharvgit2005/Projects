# Atharv KVM — Integration Validation Report

**Project Name:** Atharv KVM  
**Base:** Official Barrier v2.4.0 (`3e0d758b59e44e6bb8b5e13cf96c824be44207ac`)  
**Topology:** Windows 11 (`DESKTOP-FI99RIN`, Left, Server) ↔ macOS (`Mac.mshome.net`, Right, Client)  
**Branch:** `atharv-kvm` (`c4bad158`)  

---

## 1. Executive Summary

This report documents the Phase 2.5 real hardware integration validation for **Atharv KVM**. 

The validation confirms:
1. **Zero hardcoded network dependencies**: Server IP configuration is fully decoupled from the core protocol and persistent in user configuration.
2. **Deterministic, zero-timeout event loop synchronization**: No Cocoa event loop crashes or condition variable race timeouts.
3. **High-DPI Retina coordinate mapping**: Smooth, full-edge cursor traversal across the boundary in logical points (`1512 × 982` points on 2.0x Retina display).
4. **Clean input delivery**: Full keyboard dispatch (letters, numbers, modifier keys, backspace, enter) and bidirectional cursor transitions.
5. **Resilient reconnect lifecycle**: Automatic recovery on server restarts and clean manual connect/disconnect toggles.

---

## 2. Server IP Decoupling & Configuration

- **Configuration Key**: `serverHostname` stored in `QSettings` (`~/.config/Debian/Barrier.conf` / `~/Library/Preferences/org.barrier.Barrier.plist`).
- **Initial Default**: Configured to `10.54.49.35` / current LAN address for out-of-the-box convenience.
- **Dynamic Override**: User can change the server hostname or IP directly in the GUI text field without recompiling.
- **Core Library Decoupling**: No core protocol layer, socket layer, or CLI daemon (`barrierc`) contains any hardcoded IP addresses.

---

## 3. Real Display Diagnostics

### macOS Client (`Atharv's Macbook Pro`)
- **Number of Displays**: 1 active Liquid Retina display
- **`NSScreen[0]` Frame**: `[0, 0, 1512, 982]` logical points
- **`NSScreen[0]` Visible Frame**: `[0, 72, 1512, 877]` (accounting for macOS Menu bar and Dock)
- **`backingScaleFactor`**: `2.0`
- **`CGDisplayBounds`**: `[0, 0, 1512, 982]` logical points
- **Physical Resolution**: `3024 × 1964` physical pixels
- **Reported Barrier Screen Shape (`DINF`)**: `origin=(0,0) size=1512x982 center=(756,491)`

### Windows Server (`DESKTOP-FI99RIN`)
- **Virtual Screen Dimensions**: `GetSystemMetrics(SM_CXVIRTUALSCREEN)` × `GetSystemMetrics(SM_CYVIRTUALSCREEN)`
- **Coordinate Space**: Windows physical pixels
- **Normalization**: Normalized vertical ratio $f = \frac{y_{\text{win}}}{h_{\text{win}}}$, translated to Mac $y_{\text{mac}} = f \times 982$

---

## 4. Integration Test Results

| Test Case | Windows Coordinate | Mac Received (`CALV`/`DMMV`) | Mac Resulting Cursor | Result | Notes |
|:---|:---|:---|:---|:---:|:---|
| **Windows → Mac (0% Top)** | `(X_max, 0)` | `CALV pos=(0, 0)` | `(0, 0)` | **PASS** | Cursor enters cleanly at top-left corner |
| **Windows → Mac (25%)** | `(X_max, Y_25%)` | `CALV pos=(0, 245)` | `(0, 245)` | **PASS** | Accurate vertical mapping without offset |
| **Windows → Mac (50% Center)** | `(X_max, Y_50%)` | `CALV pos=(0, 491)` | `(0, 491)` | **PASS** | Exact center alignment; center warp check verified |
| **Windows → Mac (75%)** | `(X_max, Y_75%)` | `CALV pos=(0, 736)` | `(0, 736)` | **PASS** | Seamless lower quadrant transition |
| **Windows → Mac (100% Bottom)**| `(X_max, Y_max)` | `CALV pos=(0, 981)` | `(0, 981)` | **PASS** | Bounded correctly; edge clamping prevents dropouts |
| **Mac → Windows (0% Top)** | `(X_max, 0)` | `CLEV (leave)` | Reactivated on Windows | **PASS** | Exits Mac left edge `x <= 0` at top |
| **Mac → Windows (25%)** | `(X_max, Y_25%)` | `CLEV (leave)` | Reactivated on Windows | **PASS** | Exits Mac left edge at 25% |
| **Mac → Windows (50% Center)** | `(X_max, Y_50%)` | `CLEV (leave)` | Reactivated on Windows | **PASS** | Exits Mac left edge at 50% |
| **Mac → Windows (75%)** | `(X_max, Y_75%)` | `CLEV (leave)` | Reactivated on Windows | **PASS** | Exits Mac left edge at 75% |
| **Mac → Windows (100% Bottom)**| `(X_max, Y_max)` | `CLEV (leave)` | Reactivated on Windows | **PASS** | Exits Mac left edge at bottom |
| **Keyboard Input (Letters/Numbers)** | Physical keystrokes | `DKDN` / `DKUP` `(0x0061..)` | System input stream | **PASS** | `a-z`, `0-9` type accurately into macOS active window |
| **Keyboard Modifiers & Special** | Shift, Ctrl, Backspace, Enter | `DKDN` / `DKUP` with masks | Correct modifiers posted | **PASS** | Uppercase text, shortcut keys, line returns execute |
| **Disconnect & Reconnect** | Toggle in GUI | Disconnects & reconnects socket | `● Connected` restored | **PASS** | Clean socket teardown and instant re-establishment |
| **Server Restart & Reconnect** | Windows Server restarted | Mac retries with backoff | Auto-reconnected | **PASS** | Zero Mac client crash; reconnects on server availability |

---

## 5. Live Event Traces & Diagnostics

### Connection Handshake
```
[INFO] macOS display diagnostics: 1 NSScreen(s), 1 CGDisplay(s)
[INFO] NSScreen[0]: displayID=1 backingScaleFactor=2.0 frame=[0,0,1512,982] visibleFrame=[0,72,1512,877] CGDisplayBounds=[0,0,1512,982]
[INFO] reported screen shape to server: origin=(0,0) size=1512x982 center=(756,491) on 1 display(s)
[NOTE] connecting to '192.168.1.7': 192.168.1.7:24800
[DEBUG] event queue is ready
[DEBUG] signalling carbon loop ready
[DEBUG] starting carbon loop
[DEBUG] carbon loop ready
[INFO] sending DINF packet to server: shape=(0,0 1512x982) cursor=(756,491)
[NOTE] connected to server
```

### Transition & Input Trace
```
[INFO] recv CALV (enter): pos=(0, 491) seq=42 mask=0x0000
[DEBUG2] fakeMouseMove: cursor updated to (0, 491)
[INFO] recv DKDN (key down): id=0x0061, mask=0x0000, button=0x0000
[INFO] recv DKUP (key up): id=0x0061, mask=0x0000, button=0x0000
[INFO] recv CLEV (leave)
```

---

## 6. How to Run

### GUI Application
```bash
open ~/Desktop/Projects/barrier-custom/build/bundle/Barrier.app
```

### Command-Line Client
```bash
~/Desktop/Projects/barrier-custom/build/bin/barrierc -f --no-tray --debug INFO --disable-crypto --name Mac.mshome.net <SERVER_IP>:24800
```

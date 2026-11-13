# USB-C Virtual Ethernet Setup

The target topology is a point-to-point static link:

- Windows sender: `192.168.77.1/30`
- macOS client: `192.168.77.2/30`
- MTU: `1500`
- UDP data: `7777`
- TCP control: `7778`

## 1. Windows side

### A. Expose a USB Ethernet-capable interface

`RNDIS` is the most common Windows-facing USB gadget mode. On typical PCs, Windows cannot directly act as a USB device over USB-C without firmware or controller support, so in practice you need one of these:

- A USB gadget-capable intermediary board/device presenting RNDIS to Windows and CDC-ECM to macOS.
- A development setup using `usbipd-win` only for device pass-through testing, not as a true display transport replacement.

If the interface is already present in Device Manager, verify it under `Network adapters`.

### B. Assign the static address

List interfaces:

```powershell
Get-NetAdapter
```

Assign the address to the USB virtual NIC:

```powershell
New-NetIPAddress -InterfaceAlias "USB Ethernet" -IPAddress 192.168.77.1 -PrefixLength 30
Set-DnsClientServerAddress -InterfaceAlias "USB Ethernet" -ResetServerAddresses
```

### C. Disable firewall on that adapter profile

Find the profile:

```powershell
Get-NetConnectionProfile
```

Disable firewall for the matching network category while testing:

```powershell
Set-NetFirewallProfile -Profile Private,Public -Enabled False
```

If you only want a per-adapter rule set, create explicit allow rules for UDP `7777` and TCP `7778` bound to the USB interface.

### D. Force MTU 1500

```powershell
netsh interface ipv4 show subinterfaces
netsh interface ipv4 set subinterface "USB Ethernet" mtu=1500 store=persistent
```

### E. Disable USB selective suspend and NIC power saving

```powershell
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_USB USBSELECTIVE SUSPEND 0
powercfg /SETACTIVE SCHEME_CURRENT
```

Then in Device Manager:

1. Open the USB Ethernet adapter properties.
2. On `Power Management`, uncheck `Allow the computer to turn off this device to save power`.

## 2. macOS side

Identify the new Ethernet interface:

```bash
networksetup -listallhardwareports
ifconfig
```

Assign the static address:

```bash
sudo ifconfig en7 inet 192.168.77.2 netmask 255.255.255.252 up
sudo ifconfig en7 mtu 1500
```

Replace `en7` with the actual USB Ethernet interface name.

Verify reachability:

```bash
ping -c 5 192.168.77.1
```

## 3. RTT validation

Baseline RTT should be below 1 ms:

```powershell
ping 192.168.77.2 -n 20
```

```bash
ping -c 20 192.168.77.1
```

If RTT is consistently above 1 ms:

- Recheck USB selective suspend and NIC power management on Windows.
- Confirm both ends are fixed at MTU `1500`.
- Avoid hubs and docks that multiplex the USB path through power-saving bridges.
- Confirm no third-party VPN or packet filter is bound to the USB NIC.

## 4. Sender/client launch

Windows:

```powershell
ditto_sender.exe --ip 192.168.77.2 --test-pattern
```

macOS:

```bash
cd /Users/atharvpaharia100/Desktop/Projects/ditto/mac_client
swift run MirrorClient
```

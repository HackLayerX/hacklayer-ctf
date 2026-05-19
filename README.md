# HackLayer CTF

Secure kiosk-mode Capture The Flag platform. One command to install on Windows, macOS, or Linux. Built with Electron.

## Features

- Secure kiosk mode (no alt-tab, no task manager access)
- Real-time webcam proctoring
- Slot-based event system with live leaderboard
- Matrix Rain animated background (secure environment)
- Dark tunnel animated environment (lobby & mode select)
- **Sponsor/Ad system** with admin panel, analytics & placements
- Auto-update support (draft release → manual publish workflow)
- Offline-capable with retry queue
- Help & Guide link on login page

## Download (v1.2.14)

| Platform | Link | |
| -------- | ---- | - |
| Windows (Setup) | [HackLayer-CTF-Setup-1.2.14.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.14/HackLayer-CTF-Setup-1.2.14.exe) | ⭐ Recommended |
| macOS (Apple Silicon) | [HackLayer-CTF-1.2.14-arm64.dmg](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.14/HackLayer-CTF-1.2.14-arm64.dmg) | ⭐ Recommended |
| Linux (AppImage) | [HackLayer-CTF-1.2.14.AppImage](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.14/HackLayer-CTF-1.2.14.AppImage) | ⭐ Recommended |
| All Releases | [GitHub Releases](https://github.com/HackLayerX/hacklayer-ctf/releases) | |

## Install

### Windows

Open PowerShell and run:

```powershell
irm https://hacklayer.com/install.ps1 | iex
```

If that doesn't work:

```powershell
irm https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.ps1 | iex
```

SmartScreen might pop up — click "More info" → "Run anyway".

---

### macOS

Open Terminal and run:

```bash
curl -4 -fsSL https://hacklayer.com/install.sh | bash
```

If you get a DNS error, use this instead:

```bash
curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.sh | bash
```

Works on M1/M2/M3/M4 and Intel. If Gatekeeper blocks the app:

```bash
sudo xattr -cr /Applications/HackLayer\ CTF.app
```

---

### Linux

Open Terminal and run:

```bash
curl -4 -fsSL https://hacklayer.com/install.sh | bash
```

Or:

```bash
curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.sh | bash
```

Make the AppImage executable after download:

```bash
chmod +x HackLayer-CTF-*.AppImage
./HackLayer-CTF-*.AppImage
```

---

## SHA256 Checksums (v1.2.14)

Verify your download:

```text
(auto-generated after build — check GitHub Release page for checksums)
```

Check with:

- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.2.14.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.2.14-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.2.14.AppImage`

---

## Changelog (v1.2.14)

- **Fix:** API secret switched to URL-safe format (no special chars — eliminates signature mismatch)
- **Fix:** All 3 secret sources synchronized (GitHub CI, WordPress, local config)

### v1.2.13

- **Fix:** API signature generation — config secrets now preserved correctly in CI builds
- **New:** Help page (standalone HTML preview)
- **New:** Dungeon standalone mode
- **New:** Preview pages for backgrounds, tunnels, ads
- **CI:** Config.json generated via Node.js (no more bash special char issues)

### v1.2.12

- **New:** Custom sponsor/ad management system (WordPress admin panel)
- **New:** REST API for sponsor banners, impressions, clicks tracking
- **New:** In-app banner display on category page (post-reservation)
- **New:** Help & Guide link on login page
- **Security:** XSS protection (wp_kses + DOMParser sanitizer)
- **Security:** SSRF prevention in openExternal (blocks localhost/internal IPs)
- **Security:** Rate limiting on impression/click APIs (click fraud prevention)
- **Security:** Input validation hardening across all sponsor endpoints
- **Fix:** Matrix rain brightness/speed reduced, 7s delayed start
- **CI:** Draft releases by default (manual publish required)

---

## Links

| | |
| - | - |
| Website | [hacklayer.com](https://hacklayer.com) |
| GitHub | [github.com/HackLayerX/hacklayer-ctf](https://github.com/HackLayerX/hacklayer-ctf) |
| Install (PowerShell) | `irm https://hacklayer.com/install.ps1 \| iex` |
| Install (Bash) | `curl -4 -fsSL https://hacklayer.com/install.sh \| bash` |
| Install (GitHub raw) | `irm https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.ps1 \| iex` |

---

## License

© 2026 [HackLayer](https://hacklayer.com)

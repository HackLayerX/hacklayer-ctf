# HackLayer CTF

Kiosk-mode CTF platform. One command to install, works offline.

## Download

| Platform | Link | |
| -------- | ---- | - |
| Windows (Setup) | [HackLayer-CTF-Setup-1.2.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.0/HackLayer-CTF-Setup-1.2.0.exe) | ⭐ Recommended |
| Windows (Portable) | [HackLayer CTF 1.2.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.0/HackLayer.CTF.1.2.0.exe) | ⭐ Recommended |
| macOS (Apple Silicon) | [HackLayer-CTF-1.2.0-arm64.dmg](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.0/HackLayer-CTF-1.2.0-arm64.dmg) | ⭐ Recommended |
| Linux (AppImage) | [HackLayer-CTF-1.2.0.AppImage](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.2.0/HackLayer-CTF-1.2.0.AppImage) | ⭐ Recommended |
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
curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/docs/install.sh | bash
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
curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/docs/install.sh | bash
```

---

## SHA256 Checksums (v1.2.0)

Verify your download is legit:

```text
edeb367dadf14e2300a647bf5bce5808602330cbc68d1c784b3ec62fa0f4c63b  HackLayer CTF 1.2.0.exe
3e097c368317d5b46ee87b3ed2d0d9874d413481ff8018f52ed877464e5bffb4  HackLayer-CTF-Setup-1.2.0.exe
9e08fe44e36ae7e71a44dd589bccd2e13171f5e69297cf2b6b9b7535672456a6  HackLayer-CTF-1.2.0-arm64.dmg
0b964e16ce6f7c7e2f50981f07909167a3109fccc0735042d0dd8552d3d271a4  HackLayer-CTF-1.2.0.AppImage
```

Check with:

- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.2.0.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.2.0-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.2.0.AppImage`

---

## License

© 2026 [HackLayer](https://hacklayer.com)

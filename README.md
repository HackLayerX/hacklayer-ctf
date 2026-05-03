# HackLayer CTF

Kiosk-mode CTF platform. One command to install, works offline.

## Download

| Platform | Link | |
|----------|------|---|
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

```
e1cc9026ebcf57a43210ad39cbf74e1fbe5e42dfeaa00ee99ff2a30613eba15b  HackLayer CTF 1.2.0.exe
b21df698c67b46e6718b5f912ae3ac366096e0fe7087bc71c4913b5d2569889c  HackLayer-CTF-Setup-1.2.0.exe
9cbb6806d40779296977137d0ab9fb348f4ebd707af037e0d2016c46491ef481  HackLayer-CTF-1.2.0-arm64.dmg
51be3c758ea0e05b03f3957abf340a7c81a3a93134216f0dba98aee066fb8f97  HackLayer-CTF-1.2.0.AppImage
```

Check with:

- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.2.0.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.2.0-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.2.0.AppImage`

---

## License

© 2026 [HackLayer](https://hacklayer.com)

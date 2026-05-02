# HackLayer CTF

Kiosk-mode CTF platform. One command to install, works offline.

## Download

| Platform | Link |
|----------|------|
| Windows (Setup) | [HackLayer-CTF-Setup-1.1.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-Setup-1.1.0.exe) |
| Windows (Portable) | [HackLayer CTF 1.1.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer.CTF.1.1.0.exe) |
| macOS (Apple Silicon) | [HackLayer-CTF-1.1.0-arm64.dmg](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-1.1.0-arm64.dmg) |
| Linux (AppImage) | [HackLayer-CTF-1.1.0.AppImage](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-1.1.0.AppImage) |
| All Releases | [GitHub Releases](https://github.com/HackLayerX/hacklayer-ctf/releases) |

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

## SHA256 Checksums (v1.1.0)

Verify your download is legit:

```
9D926AAEC5FE46F2EDA5FF310135856737C221360D419DCDB68805D3F4934706  HackLayer-CTF-Setup-1.1.0.exe
D93D787A62986BE64975BF51A9FE453918C7923681FA2B0D74BD575F94C65BCD  HackLayer-CTF-1.1.0-portable.exe
28498820A75BD27E57F2A5EBDB0AB25192596D5CBB0F99C5DD0343E9B97A724E  HackLayer-CTF-1.1.0-arm64.dmg
F69844C3F8D5B0862571F73DE834EBE4E99BD95477B0B827B8306BC86F959D27  HackLayer-CTF-1.1.0.AppImage
```

Check with:

- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.1.0.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.1.0-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.1.0.AppImage`

---

## License

© 2026 [HackLayer](https://hacklayer.com)

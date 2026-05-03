# HackLayer CTF

Kiosk-mode CTF platform. One command to install, works offline.

## Download

| Platform | Link | |
|----------|------|---|
| Windows (Setup) | [HackLayer-CTF-Setup-1.1.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-Setup-1.1.0.exe) | ⭐ Recommended |
| Windows (Portable) | [HackLayer CTF 1.1.0.exe](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer.CTF.1.1.0.exe) | ⭐ Recommended |
| macOS (Apple Silicon) | [HackLayer-CTF-1.1.0-arm64.dmg](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-1.1.0-arm64.dmg) | ⭐ Recommended |
| Linux (AppImage) | [HackLayer-CTF-1.1.0.AppImage](https://github.com/HackLayerX/hacklayer-ctf/releases/download/v1.1.0/HackLayer-CTF-1.1.0.AppImage) | ⭐ Recommended |
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

## SHA256 Checksums (v1.1.0)

Verify your download is legit:

```
605A87F8D942CA63828B1BE523C58972352F14EFB83FE4F3C4DA48622F9234E8  HackLayer-CTF-Setup-1.1.0.exe
AAD5F747E3BD1CFB3B5D42F86B584BE966EC9A0BD787C278AB736FD29082E9D8  HackLayer-CTF-1.1.0-portable.exe
05F8185665CBC44BA32C73FE0F94CD59DF2C85EE553C4ADDFE0F5A8EF7761BB3  HackLayer-CTF-1.1.0-arm64.dmg
C623B3D014539AFC8A6FDD6B33496BA2CBDAC3C9B9FF8581E881B984043AEF2B  HackLayer-CTF-1.1.0.AppImage
```

Check with:

- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.1.0.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.1.0-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.1.0.AppImage`

---

## License

© 2026 [HackLayer](https://hacklayer.com)

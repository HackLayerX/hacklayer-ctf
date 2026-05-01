# HackLayer CTF

Kiosk-mode CTF platform. One command to install, works offline.

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

## SHA256 Checksums (v1.0.0)

Verify your download is legit:

```
4B331E4357464B4D53B5537C07762F219EC4CD1650B17C8D103350D6D7F104B1  HackLayer-CTF-Setup-1.0.0.exe
385E46FA09B20934C3751772D6AA13F8B595544184322E21391DFA8ED24E3A7C  HackLayer-CTF-1.0.0-arm64.dmg
1A64D301D9E4C83FEDD853CFCAAE80AA7456F3CDD2822B12EC972EA17419EF33  HackLayer-CTF-1.0.0.AppImage
```

Check with:
- Windows: `certutil -hashfile "HackLayer-CTF-Setup-1.0.0.exe" SHA256`
- Mac: `shasum -a 256 ~/Downloads/HackLayer-CTF-1.0.0-arm64.dmg`
- Linux: `sha256sum HackLayer-CTF-1.0.0.AppImage`

---

## License

© 2026 [HackLayer](https://hacklayer.com)

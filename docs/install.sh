#!/bin/bash
# HackLayer CTF - Universal Installer (Mac/Linux)
# Usage: curl -4 -fsSL https://hacklayer.com/install.sh | bash
# Or:    wget -4 -qO- https://hacklayer.com/install.sh | bash

set -e

# === CONFIG ===
BASE_URL="https://hacklayer.com/downloads"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}⚡ HackLayer CTF Installer${NC}"
echo ""

# === Auto-detect latest version from server ===
echo -e "${YELLOW}[*] Checking latest version...${NC}"
VERSION="1.0.0"
if command -v curl &> /dev/null; then
    MANIFEST=$(curl -4 -fsSL "${BASE_URL}/latest.json" 2>/dev/null || echo "")
elif command -v wget &> /dev/null; then
    MANIFEST=$(wget -4 -qO- "${BASE_URL}/latest.json" 2>/dev/null || echo "")
fi

if [ -n "$MANIFEST" ]; then
    DETECTED=$(echo "$MANIFEST" | grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')
    if [ -n "$DETECTED" ]; then
        VERSION="$DETECTED"
    fi
fi
echo -e "${GREEN}[+] Latest version: ${VERSION}${NC}"

# === OS Detection ===
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        # ARM64 build works on Intel via Rosetta 2
        FILE="HackLayer-CTF-${VERSION}-arm64.dmg"
        echo -e "${GREEN}[+] Detected: macOS ($ARCH)${NC}"
        ;;
    Linux)
        FILE="HackLayer-CTF-${VERSION}.AppImage"
        echo -e "${GREEN}[+] Detected: Linux ($ARCH)${NC}"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        FILE="HackLayer-CTF-Setup-${VERSION}.exe"
        echo -e "${GREEN}[+] Detected: Windows${NC}"
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

URL="${BASE_URL}/${FILE}"
DEST="$HOME/Downloads/${FILE}"

# === Download ===
echo -e "${YELLOW}[*] Downloading: ${FILE}${NC}"
if command -v curl &> /dev/null; then
    curl -4 -fSL --progress-bar -o "$DEST" "$URL"
elif command -v wget &> /dev/null; then
    wget -4 --show-progress -q -O "$DEST" "$URL"
else
    echo "Error: curl or wget required"
    exit 1
fi

echo -e "${GREEN}[+] Downloaded to: ${DEST}${NC}"

# === Post-download (OS-specific) ===
case "$OS" in
    Darwin)
        echo -e "${YELLOW}[*] Removing quarantine flag...${NC}"
        xattr -cr "$DEST" 2>/dev/null || true
        echo -e "${YELLOW}[*] Mounting DMG...${NC}"
        # Detach if already mounted from previous run
        hdiutil detach "/Volumes/HackLayer CTF" -quiet 2>/dev/null || true
        # Mount DMG (yes handles license agreement, /dev/null prevents stdin hang in pipe)
        MOUNT_OUTPUT=$(yes | hdiutil attach "$DEST" -nobrowse -noverify 2>/dev/null)
        MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep '/Volumes/' | sed 's/.*\/Volumes/\/Volumes/')
        if [ -z "$MOUNT_POINT" ]; then
            MOUNT_POINT="/Volumes/HackLayer CTF"
        fi
        # Remove Gatekeeper quarantine from the app inside DMG
        echo -e "${YELLOW}[*] Bypassing Gatekeeper...${NC}"
        APP_PATH=$(find "$MOUNT_POINT" -name "*.app" -maxdepth 1 2>/dev/null | head -1)
        if [ -n "$APP_PATH" ]; then
            cp -R "$APP_PATH" /Applications/
            xattr -cr "/Applications/$(basename "$APP_PATH")" 2>/dev/null || true
            # Also remove quarantine via spctl
            sudo spctl --add "/Applications/$(basename "$APP_PATH")" 2>/dev/null || true
            hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
            echo ""
            echo -e "${GREEN}[+] Installed to /Applications/$(basename "$APP_PATH")${NC}"
            echo -e "${GREEN}[+] Launching...${NC}"
            open "/Applications/$(basename "$APP_PATH")"
        else
            echo ""
            echo -e "${GREEN}[+] Done! Drag HackLayer CTF to Applications.${NC}"
            echo -e "${YELLOW}[!] If Gatekeeper blocks it, run:${NC}"
            echo -e "    sudo xattr -cr /Applications/HackLayer\\ CTF.app"
        fi
        ;;
    Linux)
        chmod +x "$DEST"
        echo -e "${GREEN}[+] Done! Run with: ${DEST}${NC}"
        read -p "Launch now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            "$DEST" &
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo -e "${GREEN}[+] Done! Run the installer: ${DEST}${NC}"
        ;;
esac

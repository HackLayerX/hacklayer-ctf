#!/bin/bash
# HackLayer CTF - Universal Installer (Mac/Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash
# Or:    wget -qO- https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.sh | bash

set -e

# === CONFIG ===
GITHUB_USER="HackLayerX"
GITHUB_REPO="hacklayer-ctf"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}⚡ HackLayer CTF Installer${NC}"
echo ""

# === Auto-detect latest version (rate-limit safe — uses redirect, not API) ===
echo -e "${YELLOW}[*] Checking latest version...${NC}"
VERSION=""
if command -v curl &> /dev/null; then
    # Use redirect URL trick — no API rate limit
    REDIRECT_URL=$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest" 2>/dev/null)
    VERSION=$(echo "$REDIRECT_URL" | grep -oE '[^/]+$' | sed 's/^v//')
elif command -v wget &> /dev/null; then
    REDIRECT_URL=$(wget --max-redirect=0 -q -O /dev/null "https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest" 2>&1 | grep -i 'Location' | awk '{print $2}')
    VERSION=$(echo "$REDIRECT_URL" | grep -oE '[^/]+$' | sed 's/^v//')
fi

if [ -z "$VERSION" ]; then
    echo -e "${YELLOW}[!] Could not detect latest version, using fallback${NC}"
    VERSION="1.0.0"
fi
echo -e "${GREEN}[+] Latest version: ${VERSION}${NC}"

# === OS Detection ===
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin)
        if [ "$ARCH" = "arm64" ]; then
            FILE="HackLayer-CTF-${VERSION}-arm64.dmg"
        else
            FILE="HackLayer-CTF-${VERSION}-x64.dmg"
        fi
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

URL="https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/download/v${VERSION}/${FILE}"
DEST="$HOME/Downloads/${FILE}"

# === Download ===
echo -e "${YELLOW}[*] Downloading: ${FILE}${NC}"
if command -v curl &> /dev/null; then
    curl -fSL --progress-bar -o "$DEST" "$URL"
elif command -v wget &> /dev/null; then
    wget --show-progress -q -O "$DEST" "$URL"
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
        hdiutil attach "$DEST" -quiet
        echo ""
        echo -e "${GREEN}[+] Done! Drag HackLayer CTF to Applications.${NC}"
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

#!/bin/bash
# HackLayer CTF - Universal Installer (Mac/Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.sh | bash
# Or:    wget -qO- https://raw.githubusercontent.com/HackLayerX/hacklayer-ctf/main/install.sh | bash

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
echo -e "${CYAN}HackLayer CTF Installer${NC}"
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
    VERSION="1.2.14"
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

# Clean up old file if exists
if [ -f "$DEST" ]; then
    rm -f "$DEST" 2>/dev/null || DEST="$HOME/Downloads/HackLayer-CTF-$(date +%H%M%S).${FILE##*.}"
fi

# === Download ===
echo -e "${YELLOW}[*] Downloading: ${FILE}${NC}"
echo -e "${YELLOW}    URL: ${URL}${NC}"

# Ensure Downloads directory exists
mkdir -p "$(dirname "$DEST")" 2>/dev/null || true

if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -fSL --progress-bar -o "$DEST" -w '%{http_code}' "$URL" 2>/dev/null) || {
        echo -e "\033[0;31m[!] Download failed (HTTP $HTTP_CODE). Check the URL or your internet connection.${NC}"
        rm -f "$DEST" 2>/dev/null
        exit 1
    }
elif command -v wget &> /dev/null; then
    wget --show-progress -q -O "$DEST" "$URL" || {
        echo -e "\033[0;31m[!] Download failed. Check the URL or your internet connection.${NC}"
        rm -f "$DEST" 2>/dev/null
        exit 1
    }
else
    echo "Error: curl or wget required"
    exit 1
fi

# Validate downloaded file
if [ ! -f "$DEST" ]; then
    echo -e "\033[0;31m[!] Downloaded file not found at: ${DEST}${NC}"
    exit 1
fi
FILE_SIZE=$(stat -f%z "$DEST" 2>/dev/null || stat -c%s "$DEST" 2>/dev/null || echo 0)
if [ "$FILE_SIZE" -lt 1000000 ]; then
    echo -e "\033[0;31m[!] Downloaded file is too small (${FILE_SIZE} bytes) - possibly a 404 error page.${NC}"
    echo -e "\033[0;31m[!] Expected URL may not exist: ${URL}${NC}"
    rm -f "$DEST" 2>/dev/null
    exit 1
fi

echo -e "${GREEN}[+] Downloaded to: ${DEST} ($(( FILE_SIZE / 1048576 )) MB)${NC}"

# === Post-download (OS-specific) ===
case "$OS" in
    Darwin)
        echo -e "${YELLOW}[*] Removing quarantine flag...${NC}"
        xattr -cr "$DEST" 2>/dev/null || true

        echo -e "${YELLOW}[*] Mounting DMG...${NC}"
        MOUNT_DIR=$(hdiutil attach "$DEST" -nobrowse -quiet | grep '/Volumes/' | awk -F'\t' '{print $NF}' | head -1)
        if [ -z "$MOUNT_DIR" ]; then
            echo -e "${YELLOW}[!] Could not auto-mount. Opening DMG manually...${NC}"
            open "$DEST"
            echo -e "${GREEN}[+] Drag HackLayer CTF to Applications.${NC}"
        else
            APP_PATH=$(find "$MOUNT_DIR" -maxdepth 1 -name "*.app" | head -1)
            if [ -n "$APP_PATH" ]; then
                APP_NAME=$(basename "$APP_PATH")
                echo -e "${YELLOW}[*] Installing ${APP_NAME} to /Applications...${NC}"
                # Kill running app if any
                pkill -f "$APP_NAME" 2>/dev/null || true
                sleep 1
                # Remove old version if exists
                if [ -d "/Applications/${APP_NAME}" ]; then
                    rm -rf "/Applications/${APP_NAME}" 2>/dev/null || {
                        echo -e "${YELLOW}[!] Cannot remove old app (try: sudo rm -rf /Applications/${APP_NAME})${NC}"
                        echo -e "${YELLOW}[!] Opening DMG instead...${NC}"
                        hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
                        open "$DEST"
                        exit 0
                    }
                fi
                cp -R "$APP_PATH" /Applications/
                xattr -cr "/Applications/${APP_NAME}" 2>/dev/null || true
                # Full Gatekeeper bypass: remove quarantine + allow in spctl
                xattr -d com.apple.quarantine "/Applications/${APP_NAME}" 2>/dev/null || true
                codesign --force --deep --sign - "/Applications/${APP_NAME}" 2>/dev/null || true
                echo -e "${GREEN}[+] Installed to /Applications/${APP_NAME}${NC}"
                echo -e "${GREEN}[+] Gatekeeper bypass applied${NC}"
                hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
                echo -e "${YELLOW}[*] Launching app...${NC}"
                open "/Applications/${APP_NAME}"
                echo -e "${GREEN}[+] Done!${NC}"
            else
                echo -e "${YELLOW}[!] No .app found in DMG. Opening manually...${NC}"
                open "$MOUNT_DIR"
            fi
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

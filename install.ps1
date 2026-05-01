# HackLayer CTF - One-Command Installer (Windows)
# Downloads from hacklayer.com, unblocks (bypasses SmartScreen), and runs the installer.
#
# === USAGE (give this one-liner to users) ===
# PowerShell:
#   irm https://hacklayer.com/install.ps1 | iex
#
# CMD:
#   powershell -ep Bypass -c "irm https://hacklayer.com/install.ps1 | iex"
#

$ErrorActionPreference = "Stop"

# === CONFIG ===
$BASE_URL = "https://hacklayer.com/wp-content/uploads/ctf-downloads"
$VERSION = "1.0.0"

Write-Host ""
Write-Host "  ⚡ HackLayer CTF - Installer" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor DarkGray
Write-Host ""

# Auto-detect latest version from server
Write-Host "  [0/3] Checking latest version ..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $manifest = Invoke-RestMethod -Uri "$BASE_URL/latest.json" -UseBasicParsing
    if ($manifest.version) {
        $VERSION = $manifest.version
    }
    Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Could not fetch latest version, using fallback v$VERSION" -ForegroundColor Yellow
}

$fileName = "HackLayer-CTF-Setup-${VERSION}.exe"
$downloadUrl = "$BASE_URL/$fileName"
$downloadPath = Join-Path $env:TEMP $fileName

# Step 1: Download
Write-Host "  [1/3] Downloading $fileName ..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "  [+] Downloaded to: $downloadPath" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Download failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Remove Mark-of-the-Web (bypasses SmartScreen)
Write-Host "  [2/3] Removing SmartScreen block ..." -ForegroundColor Yellow
Unblock-File -Path $downloadPath
# Also remove Zone.Identifier ADS directly as fallback
$adsPath = "${downloadPath}:Zone.Identifier"
if (Test-Path $adsPath -ErrorAction SilentlyContinue) {
    Remove-Item $adsPath -Force -ErrorAction SilentlyContinue
}
Write-Host "  [+] SmartScreen bypassed" -ForegroundColor Green

# Step 3: Run the installer
Write-Host "  [3/3] Launching installer ..." -ForegroundColor Yellow
Start-Process -FilePath $downloadPath
Write-Host ""
Write-Host "  ✅ Done! App is installing..." -ForegroundColor Green
Write-Host ""

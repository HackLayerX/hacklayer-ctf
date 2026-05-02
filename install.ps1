# HackLayer CTF - One-Command Installer (Windows)
# Downloads from hacklayer.com, unblocks (bypasses SmartScreen), and runs the installer.
#
# === USAGE (give this one-liner to users) ===
# PowerShell:
#   irm https://hacklayer.com/install.ps1 | iex
#
# CMD (stays open on error):
#   powershell -ep Bypass -NoExit -c "irm https://hacklayer.com/install.ps1 | iex"
#

$ErrorActionPreference = "Stop"

# === CONFIG ===
$BASE_URL = "https://hacklayer.com/downloads"
$GH_RELEASE_URL = "https://github.com/HackLayerX/hacklayer-ctf/releases/download"
$MANIFEST_URL = "https://hacklayer.com/downloads/latest.json"
$GH_MANIFEST_URL = "https://api.github.com/repos/HackLayerX/hacklayer-ctf/releases/latest"
$VERSION = "1.1.0"
$fileName = ""

Write-Host ""
Write-Host "  ⚡ HackLayer CTF - Installer" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor DarkGray
Write-Host ""

# Auto-detect latest version from server
Write-Host "  [0/3] Checking latest version ..." -ForegroundColor Yellow
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $manifest = Invoke-RestMethod -Uri "$MANIFEST_URL" -UseBasicParsing
    if ($manifest.version) {
        $VERSION = $manifest.version
    }
    if ($manifest.files.win) {
        $fileName = $manifest.files.win
    }
    Write-Host "  [+] Latest version: $VERSION (hacklayer.com)" -ForegroundColor Green
}
catch {
    # Fallback: check GitHub Releases
    try {
        $ghRelease = Invoke-RestMethod -Uri "$GH_MANIFEST_URL" -UseBasicParsing
        $VERSION = $ghRelease.tag_name -replace '^v', ''
        $fileName = "HackLayer-CTF-Setup-${VERSION}.exe"
        Write-Host "  [+] Latest version: $VERSION (GitHub)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Could not fetch latest version, using fallback v$VERSION" -ForegroundColor Yellow
    }
}

if (-not $fileName) { $fileName = "HackLayer-CTF-Setup-${VERSION}.exe" }
$downloadPath = Join-Path $env:TEMP $fileName

# Step 1: Download (try hacklayer.com first, then GitHub Releases)
Write-Host "  [1/3] Downloading $fileName ..." -ForegroundColor Yellow
$downloaded = $false
$urls = @("$BASE_URL/$fileName", "$GH_RELEASE_URL/v${VERSION}/$fileName")
foreach ($url in $urls) {
    try {
        $headResp = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 10
        $clHeader = $headResp.Headers['Content-Length']
        $totalSize = [long]$(if ($clHeader -is [array]) { $clHeader[0] } else { $clHeader })
        $totalMB = [math]::Round($totalSize / 1MB, 1)
        Write-Host "         Size: ${totalMB} MB" -ForegroundColor DarkGray
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing
        $ProgressPreference = 'SilentlyContinue'
        $downloaded = $true
        Write-Host "  [+] Downloaded: $downloadPath" -ForegroundColor Green
        break
    }
    catch {
        continue
    }
}
if (-not $downloaded) {
    Write-Host "  [!] Download failed from all sources." -ForegroundColor Red
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

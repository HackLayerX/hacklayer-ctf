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
$MANIFEST_URL = "https://hacklayer.com/downloads/latest.json"
$VERSION = "1.0.0"
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
    # Use exact filename from manifest if available
    if ($manifest.files.win) {
        $fileName = $manifest.files.win
    }
    Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Could not fetch latest version, using fallback v$VERSION" -ForegroundColor Yellow
}

if (-not $fileName) { $fileName = "HackLayer-CTF-Setup-${VERSION}.exe" }
$downloadUrl = "$BASE_URL/$fileName"
$downloadPath = Join-Path $env:TEMP $fileName

# Step 1: Download with progress
Write-Host "  [1/3] Downloading $fileName ..." -ForegroundColor Yellow
try {
    # Get file size first
    $headResp = Invoke-WebRequest -Uri $downloadUrl -Method Head -UseBasicParsing
    $clHeader = $headResp.Headers['Content-Length']
    $totalSize = [long]$(if ($clHeader -is [array]) { $clHeader[0] } else { $clHeader })
    $totalMB = [math]::Round($totalSize / 1MB, 1)
    Write-Host "         Size: ${totalMB} MB" -ForegroundColor DarkGray

    # Download with visible progress (PowerShell native progress bar)
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
    $ProgressPreference = 'SilentlyContinue'
    
    Write-Host "  [+] Downloaded: $downloadPath" -ForegroundColor Green
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

# HackLayer CTF - One-Command Installer (Windows)
# Downloads the installer from hacklayer.com, clears the downloaded-file marker
# Windows adds, and runs it.
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
$BASE_URL = "https://hacklayer.com/downloads/updates"
$GH_RELEASE_URL = "https://github.com/HackLayerX/hacklayer-ctf/releases/download"
$MANIFEST_URL = "https://hacklayer.com/downloads/updates/latest.json"
$GH_MANIFEST_URL = "https://api.github.com/repos/HackLayerX/hacklayer-ctf/releases/latest"
$VERSION = "1.2.14"
$fileName = ""

Write-Host ""
Write-Host "  HackLayer CTF Installer" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor DarkGray
Write-Host ""

# Auto-detect latest version from server
Write-Host "  [0/3] Checking latest version ..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$detected = $false

# Method 1: GitHub redirect trick (no API rate limit)
if (-not $detected) {
    try {
        $resp = Invoke-WebRequest -Uri "https://github.com/HackLayerX/hacklayer-ctf/releases/latest" -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue -TimeoutSec 10 2>&1
        $location = ""
        if ($resp.Headers -and $resp.Headers['Location']) { $location = $resp.Headers['Location'] }
        if ($location -match '/tag/v?(.+)$') {
            $VERSION = $Matches[1]
            $detected = $true
            Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
        }
    }
    catch {
        if ($_.Exception.Response.Headers.Location -match '/tag/v?(.+)$') {
            $VERSION = $Matches[1]
            $detected = $true
            Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
        }
    }
}

# Method 2: GitHub API
if (-not $detected) {
    try {
        $ghRelease = Invoke-RestMethod -Uri "$GH_MANIFEST_URL" -UseBasicParsing -TimeoutSec 10
        $VERSION = $ghRelease.tag_name -replace '^v', ''
        $detected = $true
        Write-Host "  [+] Latest version: $VERSION (GitHub API)" -ForegroundColor Green
    }
    catch {}
}

# Method 3: hacklayer.com manifest
if (-not $detected) {
    try {
        $manifest = Invoke-RestMethod -Uri "$MANIFEST_URL" -UseBasicParsing -TimeoutSec 10
        if ($manifest.version) { $VERSION = $manifest.version; $detected = $true }
        if ($manifest.files.win) { $fileName = $manifest.files.win }
        Write-Host "  [+] Latest version: $VERSION (hacklayer.com)" -ForegroundColor Green
    }
    catch {}
}

if (-not $detected) {
    Write-Host "  [+] Using version: v$VERSION" -ForegroundColor Green
}

if (-not $fileName) { $fileName = "HackLayer-CTF-Setup-${VERSION}.exe" }

# Download to user's Downloads folder (visible) instead of hidden TEMP
$downloadsFolder = [System.IO.Path]::Combine($env:USERPROFILE, "Downloads")
if (-not (Test-Path $downloadsFolder)) { $downloadsFolder = $env:TEMP }
$downloadPath = Join-Path $downloadsFolder $fileName

# Clean up old/locked file
if (Test-Path $downloadPath) {
    try {
        Remove-Item $downloadPath -Force -ErrorAction Stop
    }
    catch {
        # File locked (installer already running?) — use unique name
        $downloadPath = Join-Path $downloadsFolder "HackLayer-CTF-Setup-${VERSION}-$(Get-Date -Format 'HHmmss').exe"
    }
}

# Step 1: Download (try GitHub first, then hacklayer.com)
Write-Host "  [1/3] Downloading $fileName ..." -ForegroundColor Yellow
$downloaded = $false
$urls = @("$GH_RELEASE_URL/v${VERSION}/$fileName", "$BASE_URL/$fileName")
foreach ($url in $urls) {
    try {
        Write-Host "         Trying: $(([uri]$url).Host) ..." -ForegroundColor DarkGray
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $downloadPath -UseBasicParsing -TimeoutSec 300
        $ProgressPreference = 'Continue'

        # Verify file actually downloaded and is a valid binary (not a 404 HTML page)
        if (-not (Test-Path $downloadPath)) {
            Write-Host "         File not found after download, trying next source..." -ForegroundColor DarkGray
            continue
        }
        $fileSize = (Get-Item $downloadPath).Length
        if ($fileSize -lt 1MB) {
            Write-Host "         File too small ($('{0:N0}' -f $fileSize) bytes), trying next source..." -ForegroundColor DarkGray
            Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue
            continue
        }

        # Check it's not an HTML error page (first 2 bytes of exe = "MZ")
        $header = [System.IO.File]::ReadAllBytes($downloadPath)[0..1]
        if ($header[0] -ne 0x4D -or $header[1] -ne 0x5A) {
            Write-Host "         Downloaded file is not a valid .exe, trying next source..." -ForegroundColor DarkGray
            Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue
            continue
        }

        $totalMB = [math]::Round($fileSize / 1MB, 1)
        Write-Host "         Size: ${totalMB} MB | Source: $(([uri]$url).Host)" -ForegroundColor DarkGray
        $downloaded = $true
        Write-Host "  [+] Downloaded: $downloadPath" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "         Failed: $($_.Exception.Message)" -ForegroundColor DarkGray
        Remove-Item $downloadPath -Force -ErrorAction SilentlyContinue
        continue
    }
}
if (-not $downloaded) {
    Write-Host "  [!] Download failed from all sources." -ForegroundColor Red
    exit 1
}

# Step 2: Clear the Mark-of-the-Web.
# Windows tags every downloaded file with the zone it came from. Clearing that
# tag on a file this script has just downloaded itself is the normal, documented
# use of Unblock-File, and it is what lets the installer start without an extra
# prompt about an unidentified download.
Write-Host "  [2/3] Preparing the downloaded file ..." -ForegroundColor Yellow
Unblock-File -Path $downloadPath
# Also remove Zone.Identifier ADS directly as fallback
$adsPath = "${downloadPath}:Zone.Identifier"
if (Test-Path $adsPath -ErrorAction SilentlyContinue) {
    Remove-Item $adsPath -Force -ErrorAction SilentlyContinue
}
Write-Host "  [+] Ready to install" -ForegroundColor Green

# Step 3: Run the installer
Write-Host "  [3/3] Launching installer ..." -ForegroundColor Yellow

# Verify file exists and is not empty
$fileSize = (Get-Item $downloadPath).Length
if ($fileSize -lt 1MB) {
    Write-Host "  [!] Downloaded file is too small (${fileSize} bytes) - possibly corrupted." -ForegroundColor Red
    exit 1
}

try {
    Start-Process -FilePath $downloadPath -Wait
    Write-Host ""
    Write-Host "  [+] Done. HackLayer CTF is installed." -ForegroundColor Green
}
catch {
    Write-Host "  [!] Failed to launch installer: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  [*] Trying with admin elevation..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath $downloadPath -Verb RunAs -Wait
        Write-Host ""
        Write-Host "  [+] Done. HackLayer CTF is installed." -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Could not launch installer: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  [*] File saved at: $downloadPath" -ForegroundColor Cyan
        Write-Host "  [*] Try double-clicking the file manually." -ForegroundColor Cyan
    }
}

# Open Downloads folder so user can see the file
if (Test-Path $downloadPath) {
    Write-Host "  [*] File location: $downloadPath" -ForegroundColor Cyan
    explorer.exe /select, "$downloadPath"
}
Write-Host ""

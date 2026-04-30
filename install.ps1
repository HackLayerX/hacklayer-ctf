# HackLayer CTF - One-Command Installer (Windows)
# Downloads latest release, unblocks (bypasses SmartScreen), and runs the installer automatically.
#
# === USAGE (give this one-liner to users) ===
# PowerShell:
#   irm https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.ps1 | iex
#
# CMD:
#   powershell -ep Bypass -c "irm https://raw.githubusercontent.com/SankiiM/hacklayer-ctf-download/main/install.ps1 | iex"
#

$ErrorActionPreference = "Stop"

# === CONFIG ===
# Public releases repo (main code repo is private)
$GITHUB_USER = "SankiiM"
$GITHUB_REPO = "hacklayer-ctf-download"

Write-Host ""
Write-Host "  ⚡ HackLayer CTF - Installer" -ForegroundColor Cyan
Write-Host "  =============================" -ForegroundColor DarkGray
Write-Host ""

# Auto-detect latest version from GitHub (rate-limit safe — uses redirect, not API)
Write-Host "  [0/3] Checking latest version ..." -ForegroundColor Yellow
$VERSION = "1.0.0"
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    # Method 1: Use .NET HttpWebRequest to follow redirect and get final URL (no API call = no rate limit)
    $req = [System.Net.HttpWebRequest]::Create("https://github.com/$GITHUB_USER/$GITHUB_REPO/releases/latest")
    $req.AllowAutoRedirect = $true
    $req.Method = "HEAD"
    $resp = $req.GetResponse()
    $finalUrl = $resp.ResponseUri.ToString()
    $resp.Close()
    $tagMatch = [regex]::Match($finalUrl, '/tag/v?(.+)$')
    if ($tagMatch.Success) {
        $VERSION = $tagMatch.Groups[1].Value
    }
    Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
}
catch {
    # Method 2: Fallback to API (may hit rate limit but works most times)
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPO/releases/latest" -UseBasicParsing
        $VERSION = $release.tag_name -replace '^v', ''
        Write-Host "  [+] Latest version: $VERSION" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Could not fetch latest version, using fallback v$VERSION" -ForegroundColor Yellow
    }
}

$fileName = "HackLayer-CTF-Setup-${VERSION}.exe"
$downloadUrl = "https://github.com/$GITHUB_USER/$GITHUB_REPO/releases/download/v${VERSION}/$fileName"
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

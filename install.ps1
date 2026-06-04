<#
.SYNOPSIS
  Jarvis Terminal — Windows bootstrap.
  Checks prerequisites, installs Node.js if needed, then runs the installer.
.DESCRIPTION
  This script ensures Node.js >= 18 is available, then hands off to
  the cross-platform Node.js installer (src/install.mjs).
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Jarvis Terminal Setup"

Write-Host "`nJARVIS Terminal Setup — Windows Bootstrap`n" -ForegroundColor Magenta

# ── Check Node.js ──────────────────────────────────────────

function Get-NodeVersion {
    try {
        $ver = node --version 2>$null
        if ($ver -match 'v(\d+)\.') {
            return [int]$Matches[1]
        }
    } catch {}
    return 0
}

$nodeVersion = Get-NodeVersion

if ($nodeVersion -ge 18) {
    Write-Host "  ✓ Node.js v$nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Node.js >= 18 required (found: $nodeVersion)" -ForegroundColor Yellow

    # Try to install Node.js
    $installed = $false

    # Try winget
    if (-not $installed -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "  Installing via winget..." -ForegroundColor Cyan
        try {
            winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>&1 | Out-Null
            # Refresh PATH
            $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
            $nodeVersion = Get-NodeVersion
            if ($nodeVersion -ge 18) { $installed = $true }
        } catch {
            Write-Host "  winget install failed." -ForegroundColor Red
        }
    }

    # Try chocolatey
    if (-not $installed -and (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "  Installing via Chocolatey..." -ForegroundColor Cyan
        try {
            choco install nodejs -y 2>&1 | Out-Null
            $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
            $nodeVersion = Get-NodeVersion
            if ($nodeVersion -ge 18) { $installed = $true }
        } catch {
            Write-Host "  Chocolatey install failed." -ForegroundColor Red
        }
    }

    # Try scoop
    if (-not $installed -and (Get-Command scoop -ErrorAction SilentlyContinue)) {
        Write-Host "  Installing via Scoop..." -ForegroundColor Cyan
        try {
            scoop install nodejs 2>&1 | Out-Null
            $nodeVersion = Get-NodeVersion
            if ($nodeVersion -ge 18) { $installed = $true }
        } catch {
            Write-Host "  Scoop install failed." -ForegroundColor Red
        }
    }

    if (-not $installed) {
        Write-Host "`n  ✗ Could not install Node.js automatically." -ForegroundColor Red
        Write-Host "  Install Node.js >= 18 from: https://nodejs.org" -ForegroundColor Yellow
        Write-Host "  Then re-run this installer.`n"
        exit 1
    }

    Write-Host "  ✓ Node.js installed successfully" -ForegroundColor Green
}

# ── Check npm ──────────────────────────────────────────────

try {
    $npmVer = npm --version 2>$null
    Write-Host "  ✓ npm $npmVer found" -ForegroundColor Green
} catch {
    Write-Host "`n  ✗ npm not found. Reinstall Node.js from: https://nodejs.org`n" -ForegroundColor Red
    exit 1
}

# ── PowerShell execution policy ────────────────────────────

$policy = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction SilentlyContinue
if ($policy -eq "Restricted") {
    Write-Host "  ⚠ Setting execution policy to RemoteSigned..." -ForegroundColor Yellow
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
}

# ── Run installer ─────────────────────────────────────────

Write-Host "`n  Starting installer..." -ForegroundColor Cyan
Write-Host ""

$installer = Join-Path $PSScriptRoot "src" "install.mjs"

if (-not (Test-Path $installer)) {
    Write-Host "  ✗ Installer not found at: $installer" -ForegroundColor Red
    Write-Host "  Make sure you're running this from the Jarvis repo directory.`n"
    exit 1
}

node $installer
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n  ✗ Installation failed. Check the error above and re-run when ready.`n" -ForegroundColor Red
    exit 1
}

<#
.SYNOPSIS
  Jarvis Terminal — Windows uninstaller.
  Safely removes all Jarvis files and shell integration.
  Does NOT remove system tools (rg, fd, jq), Node.js, Python, or Git.
.DESCRIPTION
  Removes:
    - ~/.config/opencode/ directory (all config, agents, plugins, skills)
    - jarvis function from PowerShell $PROFILE
  Optional:
    - npm uninstall -g @opencode-ai/opencode
  Unchanged:
    - Node.js, npm
    - Python, pip
    - Git
    - ripgrep, fd, jq
    - Any files outside ~/.config/opencode/ and shell profile
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Jarvis Terminal — Uninstall"

$CONFIG_DIR = "$env:USERPROFILE\.config\opencode"
$HAS_CONFIG = Test-Path $CONFIG_DIR

Write-Host "`n" -NoNewline
Write-Host "╔" -NoNewline -ForegroundColor Red
Write-Host "══════════════════════════════════════════════" -NoNewline -ForegroundColor Red
Write-Host "╗" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "          JARVIS — Uninstall" -NoNewline -ForegroundColor White
Write-Host "          ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "                                          ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "  This will remove:" -NoNewline
Write-Host "                    ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • ~/.config/opencode/ (config + agents)" -NoNewline
Write-Host "  ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • 'jarvis' function from PowerShell profile" -NoNewline
Write-Host " ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "                                          ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "  This will NOT remove:" -NoNewline
Write-Host "               ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • Node.js / npm" -NoNewline
Write-Host "                         ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • Python / pip" -NoNewline
Write-Host "                            ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • ripgrep / fd / jq" -NoNewline
Write-Host "                        ║" -ForegroundColor Red
Write-Host "║" -NoNewline -ForegroundColor Red
Write-Host "    • Git" -NoNewline
Write-Host "                                        ║" -ForegroundColor Red
Write-Host "╚" -NoNewline -ForegroundColor Red
Write-Host "══════════════════════════════════════════════" -NoNewline -ForegroundColor Red
Write-Host "╝" -ForegroundColor Red

if (-not $HAS_CONFIG) {
    Write-Host "`n  ⚠ No Jarvis installation found at: $CONFIG_DIR" -ForegroundColor Yellow
    Write-Host "  Nothing to remove.`n"
    exit 0
}

Write-Host ""

# ── Confirm ────────────────────────────────────────────────

$confirm = Read-Host "`n  Type `"REMOVE`" to confirm uninstall"
if ($confirm -ne "REMOVE") {
    Write-Host "  Uninstall cancelled.`n" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# ── Remove config directory ───────────────────────────────

Write-Host "  [1/4] Removing configuration directory..." -NoNewline
if ($HAS_CONFIG) {
    try {
        Remove-Item -LiteralPath $CONFIG_DIR -Recurse -Force -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  ⚠ Could not remove: $CONFIG_DIR" -ForegroundColor Yellow
        Write-Host "  Close any open files and try again."
    }
} else {
    Write-Host " SKIPPED (not found)" -ForegroundColor Yellow
}

# ── Remove jarvis function from PowerShell profile ────────

Write-Host "  [2/4] Removing 'jarvis' function from PowerShell profile..." -NoNewline

$profilePaths = @(
    "$env:USERPROFILE\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1",
    "$env:USERPROFILE\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"
)

$found = $false
foreach ($profilePath in $profilePaths) {
    if (Test-Path $profilePath) {
        $content = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
        if ($content -and ($content -match '# Jarvis Terminal' -or $content -match 'function jarvis')) {
            # Backup
            $backup = "$profilePath.jarvis-backup"
            Copy-Item -LiteralPath $profilePath -Destination $backup -Force -ErrorAction SilentlyContinue

            # Remove Jarvis lines
            $lines = Get-Content $profilePath
            $filtered = $lines | Where-Object {
                $_ -notmatch '# Jarvis Terminal' -and
                $_ -notmatch 'function jarvis \{ opencode'
            }
            $filtered | Set-Content $profilePath -Force

            Write-Host " OK" -ForegroundColor Green
            Write-Host "  Backup saved to: $backup" -ForegroundColor Cyan
            $found = $true
        }
    }
}

if (-not $found) {
    Write-Host " NOT FOUND" -ForegroundColor Yellow
}

# ── Optional: uninstall opencode ──────────────────────────

Write-Host "  [3/4] Global opencode..." -NoNewline
try {
    $opencodeVer = opencode --version 2>$null
    Write-Host " FOUND" -ForegroundColor Green
    Write-Host ""
    $removeOpencode = Read-Host "  Also uninstall opencode globally? [y/N]"
    if ($removeOpencode -eq "y" -or $removeOpencode -eq "Y") {
        Write-Host "  Uninstalling opencode..." -NoNewline
        npm uninstall -g @opencode-ai/opencode 2>$null
        Write-Host " OK" -ForegroundColor Green
    }
} catch {
    Write-Host " NOT INSTALLED" -ForegroundColor Yellow
}

# ── Summary ────────────────────────────────────────────────

Write-Host "  [4/4] Cleanup complete." -ForegroundColor Green
Write-Host ""

Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "       ✅  Jarvis has been removed" -NoNewline
Write-Host "        ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "                                          ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "  Left intact (system):" -NoNewline
Write-Host "               ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "    • Node.js $(node --version 2>$null)" -NoNewline
Write-Host "                     ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "    • Python" -NoNewline
Write-Host "                                  ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "    • ripgrep / fd / jq" -NoNewline
Write-Host "                        ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "    • Git" -NoNewline
Write-Host "                                        ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "                                          ║" -ForegroundColor Green
Write-Host "║" -NoNewline -ForegroundColor Green
Write-Host "  Restart your terminal to complete removal." -NoNewline
Write-Host "║" -ForegroundColor Green
Write-Host "╚" -NoNewline -ForegroundColor Green
Write-Host "══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

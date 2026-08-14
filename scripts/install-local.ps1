# Install med-summit on a drive with free space (e.g. D: or E:)
# Usage: powershell -ExecutionPolicy Bypass -File install-local.ps1 -InstallPath "D:\Projects\med-summit"

param(
    [string]$InstallPath = "D:\Projects\med-summit"
)

$ErrorActionPreference = "Stop"

$parent = Split-Path -Parent $InstallPath
if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if (Test-Path $InstallPath) {
    Write-Host "Folder exists: $InstallPath"
} else {
    git clone --branch cursor/fix-vite-esm-config-ffd3 https://github.com/KapilXSam/med-summit.git $InstallPath
}

Set-Location $InstallPath
npm install
node scripts/fix-lovable-vite-config.mjs
Write-Host ""
Write-Host "Done. Start the app with:"
Write-Host "  cd $InstallPath"
Write-Host "  npm run dev"
Write-Host "Then open http://localhost:8080"

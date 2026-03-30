# Calistirmadan once: tum Next/Node sureclerini durdur (VS Code terminal, arka plan).
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

if (Test-Path node_modules) {
  Remove-Item -Recurse -Force node_modules
}

npm cache clean --force
npm install
Write-Host "Tamam. Simdi: npm run build veya npm run dev"

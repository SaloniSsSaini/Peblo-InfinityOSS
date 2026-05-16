# Peblo InfinityOS — local setup (Windows)
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n==> 1/4 npm install" -ForegroundColor Cyan
npm install

Write-Host "`n==> 2/4 Docker (Postgres + Redis)" -ForegroundColor Cyan
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "Docker not found. Install Docker Desktop, then run again:" -ForegroundColor Red
  Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "OR edit apps/api/.env DATABASE_URL for your own Postgres and skip docker." -ForegroundColor Yellow
  exit 1
}

docker compose up -d
Write-Host "Waiting 8s for Postgres..." -ForegroundColor DarkGray
Start-Sleep -Seconds 8

Write-Host "`n==> 3/4 Database migrate" -ForegroundColor Cyan
npm run db:migrate

Write-Host "`n==> 4/4 Demo seed" -ForegroundColor Cyan
npm run db:seed

Write-Host ""
Write-Host "Ready. Start apps:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Web:  http://localhost:3000" -ForegroundColor DarkGray
Write-Host "  API:  http://localhost:4000/api/health" -ForegroundColor DarkGray
Write-Host "  Demo: demo@peblo.infinityos.app / DemoInfinity2026!" -ForegroundColor DarkGray
Write-Host ""

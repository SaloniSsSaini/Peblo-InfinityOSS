# Option B — PostgreSQL on your machine (no Docker, no Redis)
# Run:  powershell -ExecutionPolicy Bypass -File scripts/setup-option-b.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host ""
Write-Host "=== Peblo InfinityOS — Option B setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "BEFORE this script, create the database in pgAdmin:" -ForegroundColor Yellow
Write-Host "  1. Open pgAdmin -> PostgreSQL -> Query Tool" -ForegroundColor DarkGray
Write-Host "  2. Run file: scripts/option-b-create-db.sql" -ForegroundColor DarkGray
Write-Host "     (or option-b-create-db-simple.sql + edit apps/api/.env)" -ForegroundColor DarkGray
Write-Host "  3. Check DATABASE_URL in apps/api/.env matches your user/password" -ForegroundColor DarkGray
Write-Host ""

$ready = Read-Host "Database created and .env updated? (y/n)"
if ($ready -ne "y" -and $ready -ne "Y") {
  Write-Host "OK — finish pgAdmin steps first, then run this script again." -ForegroundColor Yellow
  exit 0
}

Write-Host "`n==> npm install" -ForegroundColor Cyan
npm install

Write-Host "`n==> prisma migrate deploy" -ForegroundColor Cyan
Set-Location apps\api
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Migrate failed. Fix DATABASE_URL in apps/api/.env and ensure DB exists." -ForegroundColor Red
  exit 1
}

Write-Host "`n==> prisma db seed (demo user)" -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
  Write-Host "Seed failed. Check DATABASE_URL and that migrations ran." -ForegroundColor Red
  exit 1
}

Set-Location ..\..

Write-Host ""
Write-Host "Done! Start the app:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Web:  http://localhost:3000" -ForegroundColor DarkGray
Write-Host "  API:  http://localhost:4000/api/health" -ForegroundColor DarkGray
Write-Host "  Demo: demo@peblo.infinityos.app / DemoInfinity2026!" -ForegroundColor DarkGray
Write-Host ""

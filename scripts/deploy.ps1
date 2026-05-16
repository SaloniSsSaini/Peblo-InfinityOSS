# One-click deploy — Peblo InfinityOS (Docker: Postgres + Redis + API + Web)
# Run on server or locally (Docker Desktop required):
#   powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function New-RandomSecret {
  param([int]$Bytes = 48)
  $b = New-Object byte[] $Bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return [Convert]::ToBase64String($b) -replace '[+/=]', 'a'
}

Write-Host ""
Write-Host "=== Peblo InfinityOS — Deploy ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker not installed." -ForegroundColor Red
  Write-Host "Install Docker Desktop (Windows/Mac) or Docker Engine (Linux):" -ForegroundColor Yellow
  Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Then run this script again." -ForegroundColor Yellow
  exit 1
}

$envFile = ".env.deploy"
if (-not (Test-Path $envFile)) {
  Write-Host "Creating $envFile ..." -ForegroundColor DarkGray
  $hostInput = Read-Host "Server IP or domain (e.g. 203.0.113.5 or localhost)"
  if (-not $hostInput) { $hostInput = "localhost" }
  $scheme = "http"
  if ($hostInput -match '^https?://') {
    $scheme = if ($hostInput.StartsWith('https')) { 'https' } else { 'http' }
    $hostInput = $hostInput -replace '^https?://', '' -replace '/$', ''
  }
  $webUrl = "${scheme}://${hostInput}:3000"
  $apiUrl = "${scheme}://${hostInput}:4000"

  $content = @"
DEPLOY_HOST=$hostInput
WEB_PORT=3000
API_PORT=4000
PUBLIC_WEB_URL=$webUrl
PUBLIC_API_URL=$apiUrl
WEB_ORIGIN=$webUrl
POSTGRES_PASSWORD=$(New-RandomSecret)
JWT_ACCESS_SECRET=$(New-RandomSecret)
JWT_REFRESH_SECRET=$(New-RandomSecret)
DEMO_EMAIL=demo@peblo.infinityos.app
DEMO_PASSWORD=DemoInfinity2026!
DEMO_NAME=Demo visitor
OPENAI_API_KEY=
RUN_DB_SEED=1
"@
  Set-Content -Path $envFile -Value $content -Encoding UTF8
  Write-Host "Saved $envFile" -ForegroundColor Green
} else {
  Write-Host "Using existing $envFile" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Building and starting containers (first time may take 5-15 min)..." -ForegroundColor Cyan
docker compose -f docker-compose.prod.yml --env-file $envFile up -d --build

if ($LASTEXITCODE -ne 0) {
  Write-Host "Deploy failed. Check Docker is running and ports 3000/4000 are free." -ForegroundColor Red
  exit 1
}

$deployHost = (Get-Content $envFile | Where-Object { $_ -match '^DEPLOY_HOST=' }) -replace 'DEPLOY_HOST=', ''
$web = (Get-Content $envFile | Where-Object { $_ -match '^PUBLIC_WEB_URL=' }) -replace 'PUBLIC_WEB_URL=', ''
$api = (Get-Content $envFile | Where-Object { $_ -match '^PUBLIC_API_URL=' }) -replace 'PUBLIC_API_URL=', ''

Write-Host ""
Write-Host "Deployed!" -ForegroundColor Green
Write-Host "  Web app:  $web" -ForegroundColor White
Write-Host "  API:      $api/api/health" -ForegroundColor White
Write-Host "  Swagger:  $api/docs" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Demo login: demo@peblo.infinityos.app / DemoInfinity2026!" -ForegroundColor DarkGray
Write-Host ""
if ($deployHost -ne "localhost") {
  Write-Host "Open firewall ports 3000 and 4000 on your VPS." -ForegroundColor Yellow
}
Write-Host "Logs:  docker compose -f docker-compose.prod.yml --env-file .env.deploy logs -f" -ForegroundColor DarkGray
Write-Host "Stop:  docker compose -f docker-compose.prod.yml --env-file .env.deploy down" -ForegroundColor DarkGray
Write-Host ""

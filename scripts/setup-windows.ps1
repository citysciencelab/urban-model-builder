$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
  & $Action
}

function Invoke-NpmInstall {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Push-Location $Path
  try {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed in $Path"
    }
  }
  finally {
    Pop-Location
  }
}

function Invoke-NpmScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Script
  )

  Push-Location $Path
  try {
    & npm.cmd run $Script
    if ($LASTEXITCODE -ne 0) {
      throw "npm run $Script failed in $Path"
    }
  }
  finally {
    Pop-Location
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envSamplePath = Join-Path $repoRoot "config/.env.sample"
$envPath = Join-Path $repoRoot "config/.env"
$backendPath = Join-Path $repoRoot "hcu-urban-model-builder-backend"
$clientPath = Join-Path $repoRoot "hcu-urban-model-builder-client"

Invoke-Step "Preparing config/.env" {
  if (-not (Test-Path -LiteralPath $envPath)) {
    Copy-Item -LiteralPath $envSamplePath -Destination $envPath
    Write-Host "Created config/.env from config/.env.sample"
  }
  else {
    Write-Host "config/.env already exists, leaving it unchanged"
  }
}

Invoke-Step "Installing backend dependencies" {
  Invoke-NpmInstall -Path $backendPath
}

Invoke-Step "Refreshing bundled backend client package" {
  Invoke-NpmScript -Path $backendPath -Script "bundle:client"
}

Invoke-Step "Installing client dependencies" {
  Invoke-NpmInstall -Path $clientPath
}

Invoke-Step "Starting Docker services" {
  Push-Location $repoRoot
  try {
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
      throw "docker compose up -d failed"
    }
  }
  finally {
    Pop-Location
  }
}

Invoke-Step "Running backend migrations" {
  Invoke-NpmScript -Path $backendPath -Script "migrate"
}

Write-Host ""
Write-Host "Windows dev setup is complete." -ForegroundColor Green
Write-Host "Start the backend with: cd hcu-urban-model-builder-backend; npm run dev"
Write-Host "Start the client with:  cd hcu-urban-model-builder-client; npm run start"

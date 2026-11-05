Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "      DANG KHOI DONG HAPPYROOM (HOMESTAY DORM)    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "web\backend"
$frontendPath = Join-Path $PSScriptRoot "web\frontend"

$blockchainPath = Join-Path $PSScriptRoot "blockchain"
$backendEnv = Join-Path $backendPath ".env"
# Chi khi .env tro chain local (31337): mo chain Hardhat va dam bao contract da deploy.
if ((Test-Path $backendEnv) -and (Select-String -Path $backendEnv -Pattern '^AVALANCHE_CHAIN_ID=31337' -Quiet)) {
    $chainUp = $false
    try { $chainUp = (Test-NetConnection 127.0.0.1 -Port 8545 -WarningAction SilentlyContinue).TcpTestSucceeded } catch {}
    if (-not $chainUp) {
        Write-Host "0. Khoi dong chain Avalanche local (http://127.0.0.1:8545)..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$blockchainPath'; Write-Host 'Chain local - giu cua so nay mo khi test' -ForegroundColor Green; npm run chain"
    }
    Push-Location $blockchainPath
    npm run -s local:ensure
    Pop-Location
}

Write-Host "1. Khoi dong Backend (http://localhost:5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; Write-Host 'HappyRoom Backend Server' -ForegroundColor Green; npm run dev"

Write-Host "2. Khoi dong Frontend (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; Write-Host 'HappyRoom Frontend Server' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Da bat ca 2 server trong 2 cua so rieng biet!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green


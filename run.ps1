Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "      DANG KHOI DONG HAPPYROOM (HOMESTAY DORM)    " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "Web\backend"
$frontendPath = Join-Path $PSScriptRoot "Web\frontend"

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

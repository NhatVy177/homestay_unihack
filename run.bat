@echo off
title HappyRoom Launcher
echo ===================================================
echo       DANG KHOI DONG HAPPYROOM (HOMESTAY DORM)
echo ===================================================
echo.
echo [1/2] Dang khoi dong Backend tai http://localhost:5000 ...
start "HappyRoom - Backend" cmd /k "cd /d "%~dp0web\backend" && npm run dev"

echo [2/2] Dang khoi dong Frontend tai http://localhost:5173 ...
start "HappyRoom - Frontend" cmd /k "cd /d "%~dp0web\frontend" && npm run dev"

echo.
echo ===================================================
echo Da bat ca 2 server:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:5000
echo ===================================================
echo Ban co the tat cua so nay.
timeout /t 5


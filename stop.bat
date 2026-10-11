@echo off
setlocal enabledelayedexpansion
title FloodLens - Stopping Services

echo ======================================================================
echo                  FloodLens - Stopping Services
echo ======================================================================
echo.

set "STOPPED_COUNT=0"

:: 1. Terminate processes listening on port 8000 (FastAPI Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [STOP] Terminating Backend process on port 8000 [PID: %%a]
    taskkill /f /t /pid %%a >nul 2>&1
    set /a STOPPED_COUNT+=1
)

:: 2. Terminate processes listening on port 5173 (Vite Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo [STOP] Terminating Frontend process on port 5173 [PID: %%a]
    taskkill /f /t /pid %%a >nul 2>&1
    set /a STOPPED_COUNT+=1
)

:: 3. Close command prompt windows with FloodLens titles
taskkill /fi "WINDOWTITLE eq FloodLens Backend*" /t /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FloodLens Frontend*" /t /f >nul 2>&1

:: 4. Stop Docker containers if running
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker stop floodlens-backend floodlens-frontend >nul 2>&1
)

:: Allow 1 second for ports to fully clear
ping 127.0.0.1 -n 2 >nul

echo.
echo ======================================================================
echo            All FloodLens Services Have Been Successfully Stopped
echo ======================================================================
echo.

if "%~1"=="--silent" goto :end

echo Press any key to close this window...
pause >nul

:end
exit /b 0

@echo off
setlocal enabledelayedexpansion
title FloodLens Launcher

cd /d "%~dp0"

echo ======================================================================
echo             FloodLens - Environmental Flood-Risk Platform
echo ======================================================================
echo.

:: 1. Detect Python Executable
set "PYTHON_CMD="
if exist "%~dp0.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0.venv\Scripts\python.exe" & goto :python_found
if exist "%~dp0venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0venv\Scripts\python.exe" & goto :python_found
if exist "%~dp0backend\.venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0backend\.venv\Scripts\python.exe" & goto :python_found
if exist "%~dp0backend\venv\Scripts\python.exe" set "PYTHON_CMD=%~dp0backend\venv\Scripts\python.exe" & goto :python_found

where python.exe >nul 2>&1
if %errorlevel% equ 0 set "PYTHON_CMD=python" & goto :python_found

where py.exe >nul 2>&1
if %errorlevel% equ 0 set "PYTHON_CMD=py" & goto :python_found

:python_found
if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found in your PATH or virtual environment.
    echo Please install Python 3.12+ from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Using Python: %PYTHON_CMD%

:: 2. Detect Node / npm
where npm.cmd >nul 2>&1
if %errorlevel% neq 0 (
    where npm >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Node.js / npm was not found in your PATH.
        echo Please install Node.js v18+ from https://nodejs.org/
        pause
        exit /b 1
    )
)
echo [OK] Node.js / npm detected.

:: 3. Configure environment files if not present
if not exist "%~dp0backend\.env" (
    if exist "%~dp0backend\.env.example" (
        echo [SETUP] Creating backend\.env from template...
        copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    )
)

if not exist "%~dp0frontend\.env.local" (
    if exist "%~dp0frontend\.env.example" (
        echo [SETUP] Creating frontend\.env.local from template...
        copy "%~dp0frontend\.env.example" "%~dp0frontend\.env.local" >nul
    )
)

:: 4. Check frontend dependencies
if not exist "%~dp0frontend\node_modules" (
    echo [SETUP] Installing frontend npm packages...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    if %errorlevel% neq 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
)

:: 5. Check Python dependencies
"%PYTHON_CMD%" -c "import fastapi, uvicorn, pydantic, floodlens_ml" >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Installing Python dependencies from requirements.txt...
    "%PYTHON_CMD%" -m pip install -r "%~dp0requirements.txt"
)

:: 6. Clean up any stale instances on ports 8000 and 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [INFO] Freeing occupied backend port 8000 [PID: %%a]
    taskkill /f /t /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo [INFO] Freeing occupied frontend port 5173 [PID: %%a]
    taskkill /f /t /pid %%a >nul 2>&1
)

:: Allow half a second after cleanup
ping 127.0.0.1 -n 2 >nul

:: 6. Launch FastAPI Backend in a new window
echo [START] Launching FloodLens Backend on http://127.0.0.1:8000 ...
start "FloodLens Backend" /d "%~dp0backend" cmd /k "title FloodLens Backend && echo ================================================ && echo   FloodLens Backend API [FastAPI] && echo   Running on: http://127.0.0.1:8000 && echo   Interactive Docs: http://127.0.0.1:8000/docs && echo ================================================ && echo. && set PYTHONPATH=%~dp0ml-model\src;%~dp0backend;%%PYTHONPATH%% && "%PYTHON_CMD%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 7. Launch Vite Frontend in a new window
echo [START] Launching FloodLens Frontend on http://localhost:5173 ...
start "FloodLens Frontend" /d "%~dp0frontend" cmd /k "title FloodLens Frontend && echo ================================================ && echo   FloodLens Frontend [React / Vite] && echo   Running on: http://localhost:5173 && echo ================================================ && echo. && npm run dev"

:: 8. Wait for services to initialize
echo.
echo [WAIT] Waiting for services to initialize...
ping 127.0.0.1 -n 4 >nul

:: 9. Automatically open browser to frontend
echo [BROWSER] Opening http://localhost:5173/ ...
start "" "http://localhost:5173/"

:: 10. Display running dashboard and interactive controller
cls
echo ======================================================================
echo                FloodLens is Running Successfully!
echo ======================================================================
echo.
echo   [Web App UI]      http://localhost:5173/
echo   [Backend API]     http://127.0.0.1:8000/
echo   [API Health]      http://127.0.0.1:8000/api/health
echo   [API Swagger]     http://127.0.0.1:8000/docs
echo.
echo ======================================================================
echo   Both services are running in their respective command windows:
echo     - 'FloodLens Backend'
echo     - 'FloodLens Frontend'
echo.
echo   To stop all services:
echo     - Press ANY KEY in this window, or
echo     - Run 'stop.bat' from another terminal / File Explorer.
echo ======================================================================
echo.

pause >nul

echo.
echo [STOP] Shutting down all FloodLens services...
call "%~dp0stop.bat" --silent
echo [OK] All services stopped.
ping 127.0.0.1 -n 2 >nul
exit /b 0

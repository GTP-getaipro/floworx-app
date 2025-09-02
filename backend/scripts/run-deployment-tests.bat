@echo off
setlocal enabledelayedexpansion

REM FloWorx Deployment Testing Script for Windows
REM Starts server and runs comprehensive API tests

set PORT=5001
set NODE_ENV=development
set SERVER_PID=

echo.
echo 🚀 FloWorx Deployment Testing Suite
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed
    exit /b 1
)

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found. Please run from backend directory.
    exit /b 1
)

echo ✅ Dependencies check passed

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ℹ️  Dependencies already installed
)

REM Kill any existing process on the port
echo Checking for existing processes on port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT%') do (
    echo Killing process %%a on port %PORT%
    taskkill /f /pid %%a >nul 2>&1
)

REM Start the server
echo Starting FloWorx server on port %PORT%...
start /b cmd /c "set NODE_ENV=%NODE_ENV% && set PORT=%PORT% && node server.js > server.log 2>&1"

REM Wait for server to be ready
echo Waiting for server to be ready...
set /a counter=0
:wait_loop
set /a counter+=1
if %counter% gtr 30 (
    echo ❌ Server failed to start within 30 seconds
    type server.log
    exit /b 1
)

REM Try to connect to server
curl -s http://localhost:%PORT%/health >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

echo ✅ Server is ready!

REM Install colors package if not present
npm list colors >nul 2>&1
if errorlevel 1 (
    echo Installing colors package for test output...
    npm install colors --save-dev
)

REM Run the deployment tests
echo Running deployment tests...
set TEST_BASE_URL=http://localhost:%PORT%
node scripts/test-deployment.js

set TEST_RESULT=%errorlevel%

REM Show server logs
echo.
echo Monitoring server logs (last 20 lines):
echo ----------------------------------------
powershell -Command "Get-Content server.log -Tail 20"
echo ----------------------------------------

REM Kill the server process
echo Stopping server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT%') do (
    taskkill /f /pid %%a >nul 2>&1
)

if %TEST_RESULT% equ 0 (
    echo ✅ All deployment tests completed successfully!
    exit /b 0
) else (
    echo ❌ Some deployment tests failed!
    exit /b 1
)

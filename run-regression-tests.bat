@echo off
REM FloWorx Regression Testing Script for Windows
REM Executes comprehensive regression testing using existing Jest framework

echo ========================================
echo FloWorx Comprehensive Regression Testing
echo ========================================
echo.

REM Check if we're in the correct directory
if not exist "backend\package.json" (
    echo Error: Please run this script from the FloWorx project root directory
    echo Expected to find backend\package.json
    pause
    exit /b 1
)

REM Set environment variables
set NODE_ENV=test
set JWT_SECRET=test-jwt-secret-for-regression-testing-32-chars
set ENCRYPTION_KEY=test-encryption-key-32-chars-long

echo Setting up test environment...
echo NODE_ENV=%NODE_ENV%
echo.

REM Change to backend directory
cd backend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Parse command line arguments
set VERBOSE=false
set COVERAGE=false
set SUITE=all

:parse_args
if "%1"=="--verbose" (
    set VERBOSE=true
    shift
    goto parse_args
)
if "%1"=="--coverage" (
    set COVERAGE=true
    shift
    goto parse_args
)
if "%1"=="--suite" (
    set SUITE=%2
    shift
    shift
    goto parse_args
)
if "%1"=="--help" (
    goto show_help
)
if not "%1"=="" (
    shift
    goto parse_args
)

echo Starting regression tests...
echo Verbose mode: %VERBOSE%
echo Coverage: %COVERAGE%
echo Test suite: %SUITE%
echo.

REM Execute tests based on suite selection
if "%SUITE%"=="all" (
    echo Running full regression test suite...
    node ..\scripts\run-full-regression.js
    if errorlevel 1 (
        echo.
        echo ❌ Full regression tests failed
        goto test_failed
    )
) else if "%SUITE%"=="unit" (
    echo Running unit tests...
    npm run test:unit
    if errorlevel 1 (
        echo.
        echo ❌ Unit tests failed
        goto test_failed
    )
) else if "%SUITE%"=="integration" (
    echo Running integration tests...
    npm run test:integration
    if errorlevel 1 (
        echo.
        echo ❌ Integration tests failed
        goto test_failed
    )
) else if "%SUITE%"=="auth" (
    echo Running authentication regression tests...
    npm run test:auth-regression
    if errorlevel 1 (
        echo.
        echo ❌ Authentication regression tests failed
        goto test_failed
    )
) else if "%SUITE%"=="monitoring" (
    echo Running monitoring regression tests...
    npm run test:monitoring-regression
    if errorlevel 1 (
        echo.
        echo ❌ Monitoring regression tests failed
        goto test_failed
    )
) else if "%SUITE%"=="performance" (
    echo Running performance tests...
    npm run test:performance
    if errorlevel 1 (
        echo.
        echo ❌ Performance tests failed
        goto test_failed
    )
) else if "%SUITE%"=="security" (
    echo Running security tests...
    jest tests/security --verbose
    if errorlevel 1 (
        echo.
        echo ❌ Security tests failed
        goto test_failed
    )
) else (
    echo Error: Unknown test suite '%SUITE%'
    echo Available suites: all, unit, integration, auth, monitoring, performance, security
    goto test_failed
)

REM Run coverage if requested
if "%COVERAGE%"=="true" (
    echo.
    echo Generating coverage report...
    npm run test:coverage
    if errorlevel 1 (
        echo Warning: Coverage report generation failed
    ) else (
        echo Coverage report generated in coverage\lcov-report\index.html
    )
)

echo.
echo ✅ Regression tests completed successfully!
echo.
echo Next steps:
echo 1. Review test results in test-results\ directory
echo 2. Check coverage report if generated
echo 3. Address any recommendations in the test report
echo 4. Proceed with deployment if all tests passed

REM Return to original directory
cd ..

echo.
pause
exit /b 0

:test_failed
echo.
echo ❌ Regression tests failed!
echo.
echo Troubleshooting steps:
echo 1. Check the error messages above
echo 2. Review test logs in test-results\ directory
echo 3. Fix failing tests before proceeding
echo 4. Re-run tests after fixes
echo.
echo For help, run: %0 --help

REM Return to original directory
cd ..

pause
exit /b 1

:show_help
echo.
echo FloWorx Regression Testing Script
echo.
echo Usage: %0 [options]
echo.
echo Options:
echo   --verbose     Enable verbose output
echo   --coverage    Generate coverage report after tests
echo   --suite NAME  Run specific test suite (default: all)
echo   --help        Show this help message
echo.
echo Available test suites:
echo   all           Run complete regression test suite (default)
echo   unit          Run unit tests only
echo   integration   Run integration tests only
echo   auth          Run authentication regression tests
echo   monitoring    Run monitoring system regression tests
echo   performance   Run performance tests only
echo   security      Run security tests only
echo.
echo Examples:
echo   %0                           # Run all tests
echo   %0 --verbose                 # Run all tests with verbose output
echo   %0 --suite unit --coverage   # Run unit tests with coverage
echo   %0 --suite auth              # Run authentication tests only
echo.

REM Return to original directory
cd ..

pause
exit /b 0

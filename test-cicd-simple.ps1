# FloWorx CI/CD Pipeline Simple Test Script
# Tests core components without Unicode characters

param(
    [string]$BaseUrl = "https://app.floworx-iq.com",
    [switch]$SkipDeployment
)

$ErrorActionPreference = "Stop"
$TestResults = @{}
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

function Write-TestResult {
    param([string]$TestName, [string]$Status, [string]$Message = "")
    
    $script:TotalTests++
    $TestResults[$TestName] = $Status
    
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "White" }
    }
    
    $icon = switch ($Status) {
        "PASS" { "[PASS]" }
        "FAIL" { "[FAIL]" }
        "SKIP" { "[SKIP]" }
        default { "[????]" }
    }
    
    if ($Status -eq "PASS") { $script:PassedTests++ }
    if ($Status -eq "FAIL") { $script:FailedTests++ }
    
    Write-Host "$icon $TestName" -ForegroundColor $color
    if ($Message) {
        Write-Host "      $Message" -ForegroundColor Gray
    }
}

function Test-FileExists {
    param([string]$FilePath, [string]$TestName)
    
    if (Test-Path $FilePath) {
        Write-TestResult $TestName "PASS" "File exists: $FilePath"
    } else {
        Write-TestResult $TestName "FAIL" "File missing: $FilePath"
    }
}

function Test-FileContains {
    param([string]$FilePath, [string]$Pattern, [string]$TestName)
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw
        if ($content -match $Pattern) {
            Write-TestResult $TestName "PASS" "Pattern found in $FilePath"
        } else {
            Write-TestResult $TestName "FAIL" "Pattern not found in $FilePath"
        }
    } else {
        Write-TestResult $TestName "FAIL" "File not found: $FilePath"
    }
}

function Test-HttpEndpoint {
    param([string]$Url, [string]$TestName, [string]$ExpectedStatus = "ok")
    
    if ($SkipDeployment) {
        Write-TestResult $TestName "SKIP" "Deployment tests skipped"
        return
    }
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 10
        if ($response.status -eq $ExpectedStatus) {
            Write-TestResult $TestName "PASS" "Endpoint responded correctly"
        } else {
            Write-TestResult $TestName "FAIL" "Unexpected status: $($response.status)"
        }
    } catch {
        Write-TestResult $TestName "FAIL" "Endpoint failed: $($_.Exception.Message)"
    }
}

# Main test execution
Write-Host "Starting FloWorx CI/CD Pipeline Tests..." -ForegroundColor Cyan
Write-Host "Target URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "Skip Deployment: $SkipDeployment" -ForegroundColor Cyan
Write-Host ""

# Test 1: CI/CD Pipeline Files
Write-Host "Testing CI/CD Pipeline Files..." -ForegroundColor Yellow
Test-FileExists ".github/workflows/ci-cd-pipeline.yml" "GitHub Actions Workflow"
Test-FileExists "scripts/deploy-blue-green.sh" "Blue-Green Deployment Script"
Test-FileExists "scripts/switch-traffic.sh" "Traffic Switching Script"
Test-FileExists "scripts/rollback.sh" "Rollback Script"
Test-FileExists "deployment-orchestration.js" "Deployment Orchestration"

# Test 2: Configuration Files
Write-Host "`nTesting Configuration Files..." -ForegroundColor Yellow
Test-FileExists "production-environment-setup.js" "Production Environment Setup"
Test-FileExists "backend/config/production-security.js" "Security Configuration"
Test-FileExists "database-schema-validation.js" "Database Schema Validation"
Test-FileExists "monitoring/monitoring-setup.js" "Monitoring Setup"
Test-FileExists "security-audit-script.js" "Security Audit Script"

# Test 3: Test Files
Write-Host "`nTesting Test Files..." -ForegroundColor Yellow
Test-FileExists "tests/functional/critical-user-flows.test.js" "Functional Tests"
Test-FileExists "tests/performance/load-testing.js" "Performance Tests"

# Test 4: Package.json Scripts
Write-Host "`nTesting Package.json Scripts..." -ForegroundColor Yellow
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $requiredScripts = @(
        "deploy:orchestrate",
        "deploy:blue-green", 
        "deploy:switch-traffic",
        "deploy:rollback",
        "monitoring:setup",
        "security:audit",
        "performance:load-test"
    )
    
    foreach ($script in $requiredScripts) {
        if ($packageJson.scripts.$script) {
            Write-TestResult "Package Script: $script" "PASS"
        } else {
            Write-TestResult "Package Script: $script" "FAIL"
        }
    }
} catch {
    Write-TestResult "Package.json Scripts" "FAIL" "Error reading package.json"
}

# Test 5: File Content Validation
Write-Host "`nTesting File Content..." -ForegroundColor Yellow
Test-FileContains ".github/workflows/ci-cd-pipeline.yml" "FloWorx CI/CD Pipeline" "Workflow Content"
Test-FileContains "scripts/deploy-blue-green.sh" "Blue-Green Deployment" "Blue-Green Script Content"
Test-FileContains "scripts/switch-traffic.sh" "Traffic Switching" "Traffic Switch Content"
Test-FileContains "scripts/rollback.sh" "Automated Rollback" "Rollback Script Content"
Test-FileContains "deployment-orchestration.js" "DeploymentOrchestrator" "Orchestration Content"

# Test 6: Production Endpoints (if not skipped)
if (-not $SkipDeployment) {
    Write-Host "`nTesting Production Endpoints..." -ForegroundColor Yellow
    Test-HttpEndpoint "$BaseUrl/api/health" "Health Endpoint"
    
    # Test authentication endpoint
    try {
        $testEmail = "cicd-test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        $body = @{
            email = $testEmail
            password = "CICDTest123!"
            firstName = "CICD"
            lastName = "Test"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/test-register" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        if ($response.success -eq $true) {
            Write-TestResult "Authentication Endpoint" "PASS" "Registration successful"
        } else {
            Write-TestResult "Authentication Endpoint" "FAIL" "Registration failed"
        }
    } catch {
        Write-TestResult "Authentication Endpoint" "FAIL" "Endpoint error: $($_.Exception.Message)"
    }
} else {
    Write-Host "`nSkipping Production Endpoint Tests..." -ForegroundColor Yellow
}

# Generate Report
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "FLOWORX CI/CD PIPELINE TEST REPORT" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$successRate = if ($TotalTests -gt 0) {
    [math]::Round(($PassedTests / $TotalTests) * 100, 1)
} else { 0 }

Write-Host "`nOVERALL RESULTS:" -ForegroundColor Yellow
Write-Host "Total Tests: $TotalTests" -ForegroundColor White
Write-Host "Passed: $PassedTests" -ForegroundColor Green
Write-Host "Failed: $FailedTests" -ForegroundColor Red
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
Write-Host "Target URL: $BaseUrl" -ForegroundColor White

Write-Host "`nDETAILED RESULTS:" -ForegroundColor Yellow
foreach ($test in $TestResults.Keys | Sort-Object) {
    $status = $TestResults[$test]
    $color = switch ($status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
        default { "White" }
    }
    Write-Host "  [$status] $test" -ForegroundColor $color
}

Write-Host "`nRECOMMENDATIONS:" -ForegroundColor Yellow
if ($FailedTests -eq 0) {
    Write-Host "All tests passed! CI/CD pipeline is ready for production." -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Please address the failed components before deployment." -ForegroundColor Red
    
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    foreach ($test in $TestResults.Keys) {
        if ($TestResults[$test] -eq "FAIL") {
            Write-Host "  - $test" -ForegroundColor Red
        }
    }
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan

# Save report
$reportData = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    TotalTests = $TotalTests
    PassedTests = $PassedTests
    FailedTests = $FailedTests
    SuccessRate = $successRate
    BaseUrl = $BaseUrl
    SkippedDeployment = $SkipDeployment
    Results = $TestResults
}

$reportPath = "cicd-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportData | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath
Write-Host "Test report saved to: $reportPath" -ForegroundColor Cyan

# Exit with appropriate code
if ($FailedTests -eq 0) {
    Write-Host "`nCI/CD Pipeline testing completed successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nCI/CD Pipeline testing completed with failures!" -ForegroundColor Red
    exit 1
}

# FloWorx UAT Simple Validation Script
# Basic User Acceptance Testing validation

param(
    [string]$BaseUrl = "https://app.floworx-iq.com",
    [string]$Environment = "production"
)

$ErrorActionPreference = "Continue"

function Write-UATLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [UAT-$Level] $Message" -ForegroundColor $color
}

# Test Results
$TestResults = @{
    "TotalTests" = 0
    "PassedTests" = 0
    "FailedTests" = 0
    "Tests" = @()
}

function Run-UATTest {
    param(
        [string]$TestName,
        [scriptblock]$TestScript
    )
    
    Write-UATLog "Running test: $TestName" "INFO"
    $TestResults.TotalTests++
    
    try {
        $result = & $TestScript
        if ($result) {
            Write-UATLog "PASSED: $TestName" "SUCCESS"
            $TestResults.PassedTests++
            $TestResults.Tests += @{ Name = $TestName; Status = "PASSED"; Error = $null }
        } else {
            Write-UATLog "FAILED: $TestName" "ERROR"
            $TestResults.FailedTests++
            $TestResults.Tests += @{ Name = $TestName; Status = "FAILED"; Error = "Test returned false" }
        }
    } catch {
        Write-UATLog "FAILED: $TestName - $($_.Exception.Message)" "ERROR"
        $TestResults.FailedTests++
        $TestResults.Tests += @{ Name = $TestName; Status = "FAILED"; Error = $_.Exception.Message }
    }
}

# Test 1: Health Check
Run-UATTest "Health Check" {
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10
        return ($response.status -eq "ok")
    } catch {
        Write-UATLog "Health check failed: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

# Test 2: Authentication Required
Run-UATTest "Authentication Required" {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/onboarding/business-types" -Method GET -TimeoutSec 10
        return ($response.StatusCode -eq 401)
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            return $true
        } else {
            return $false
        }
    }
}

# Test 3: Input Validation
Run-UATTest "Input Validation" {
    try {
        $invalidData = @{
            email = "invalid-email"
            password = "123"
            firstName = ""
            lastName = ""
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/test-register" -Method POST -Body $invalidData -ContentType "application/json" -TimeoutSec 10
        return ($response.success -eq $false)
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            return $true
        } else {
            return $false
        }
    }
}

# Test 4: CORS Headers
Run-UATTest "CORS Headers" {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10
        $corsHeader = $response.Headers["Access-Control-Allow-Origin"]
        return ($corsHeader -ne $null)
    } catch {
        return $false
    }
}

# Test 5: Response Time
Run-UATTest "Response Time Under 2 Seconds" {
    try {
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-UATLog "Response time: $responseTime ms" "INFO"
        return ($responseTime -lt 2000)
    } catch {
        return $false
    }
}

# Test 6: SSL Certificate
Run-UATTest "SSL Certificate Valid" {
    try {
        $response = Invoke-WebRequest -Uri $BaseUrl -Method GET -TimeoutSec 10
        return ($response.BaseResponse.ResponseUri.Scheme -eq "https")
    } catch {
        return $false
    }
}

# Test 7: Basic Registration Flow
Run-UATTest "Basic Registration Flow" {
    try {
        $testEmail = "uat-test-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        $registrationData = @{
            email = $testEmail
            password = "UATTest123!"
            firstName = "UAT"
            lastName = "Test"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/auth/test-register" -Method POST -Body $registrationData -ContentType "application/json" -TimeoutSec 10
        return ($response.success -eq $true)
    } catch {
        Write-UATLog "Registration test failed: $($_.Exception.Message)" "WARNING"
        return $false
    }
}

# Test 8: Business Types Endpoint (with auth)
Run-UATTest "Business Types Endpoint Structure" {
    try {
        # This test checks if the endpoint exists and returns proper error for no auth
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/onboarding/business-types" -Method GET -TimeoutSec 10
        return $false  # Should not succeed without auth
    } catch {
        # Should return 401 Unauthorized
        return ($_.Exception.Response.StatusCode -eq 401)
    }
}

# Test 9: Email Provider Endpoint Structure
Run-UATTest "Email Provider Endpoint Structure" {
    try {
        $response = Invoke-WebRequest -Uri "$BaseUrl/api/onboarding/email-provider" -Method POST -TimeoutSec 10
        return $false  # Should not succeed without auth
    } catch {
        # Should return 401 Unauthorized
        return ($_.Exception.Response.StatusCode -eq 401)
    }
}

# Test 10: Rate Limiting Basic Check
Run-UATTest "Basic Service Availability" {
    try {
        $requests = 1..5 | ForEach-Object {
            try {
                $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 5
                return ($response.StatusCode -eq 200)
            } catch {
                return $false
            }
        }
        
        $successfulRequests = ($requests | Where-Object { $_ -eq $true }).Count
        return ($successfulRequests -ge 3)  # At least 3 out of 5 should succeed
    } catch {
        return $false
    }
}

# Generate Report
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "FLOWORX USER ACCEPTANCE TESTING REPORT" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`nOVERALL RESULTS:" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "Base URL: $BaseUrl" -ForegroundColor White
Write-Host "Total Tests: $($TestResults.TotalTests)" -ForegroundColor White
Write-Host "Passed: $($TestResults.PassedTests)" -ForegroundColor Green
Write-Host "Failed: $($TestResults.FailedTests)" -ForegroundColor Red

$successRate = if ($TestResults.TotalTests -gt 0) {
    [math]::Round(($TestResults.PassedTests / $TestResults.TotalTests) * 100, 1)
} else { 0 }

Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`nDETAILED RESULTS:" -ForegroundColor Yellow
foreach ($test in $TestResults.Tests) {
    $statusColor = if ($test.Status -eq "PASSED") { "Green" } else { "Red" }
    Write-Host "$($test.Status): $($test.Name)" -ForegroundColor $statusColor
    if ($test.Error) {
        Write-Host "  Error: $($test.Error)" -ForegroundColor Red
    }
}

Write-Host "`nSIGN-OFF STATUS:" -ForegroundColor Yellow
if ($TestResults.FailedTests -eq 0) {
    Write-Host "UAT APPROVED - READY FOR PRODUCTION RELEASE" -ForegroundColor Green
    $signOffStatus = "APPROVED"
} elseif ($successRate -ge 80) {
    Write-Host "UAT CONDITIONAL APPROVAL - MINOR ISSUES DETECTED" -ForegroundColor Yellow
    $signOffStatus = "CONDITIONAL"
} else {
    Write-Host "UAT REJECTED - CRITICAL ISSUES REQUIRE FIXES" -ForegroundColor Red
    $signOffStatus = "REJECTED"
}

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan

# Save report
$reportData = @{
    Environment = $Environment
    BaseUrl = $BaseUrl
    Timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    TotalTests = $TestResults.TotalTests
    PassedTests = $TestResults.PassedTests
    FailedTests = $TestResults.FailedTests
    SuccessRate = $successRate
    SignOffStatus = $signOffStatus
    Tests = $TestResults.Tests
}

$reportPath = "uat-simple-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportData | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath
Write-UATLog "UAT report saved: $reportPath" "SUCCESS"

# Exit with appropriate code
if ($signOffStatus -eq "APPROVED") {
    Write-UATLog "UAT validation completed successfully!" "SUCCESS"
    exit 0
} elseif ($signOffStatus -eq "CONDITIONAL") {
    Write-UATLog "UAT validation completed with minor issues" "WARNING"
    exit 0
} else {
    Write-UATLog "UAT validation failed - critical issues detected" "ERROR"
    exit 1
}

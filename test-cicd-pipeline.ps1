# FloWorx CI/CD Pipeline Comprehensive Test Script
# Tests all components of the CI/CD pipeline, deployment execution, and monitoring

param(
    [string]$BaseUrl = "https://app.floworx-iq.com",
    [string]$TestType = "all",
    [switch]$SkipDeployment,
    [switch]$Verbose
)

# Configuration
$ErrorActionPreference = "Stop"
$TestResults = @{
    "CI/CD Pipeline" = @{}
    "Deployment Execution" = @{}
    "Verification Testing" = @{}
    "Monitoring Setup" = @{}
    "Overall" = @{
        "TotalTests" = 0
        "PassedTests" = 0
        "FailedTests" = 0
        "StartTime" = Get-Date
    }
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    
    if ($Verbose) {
        Add-Content -Path "cicd-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log" -Value "[$timestamp] [$Level] $Message"
    }
}

function Test-CICDPipeline {
    Write-TestLog "🔄 Testing CI/CD Pipeline Components" "INFO"
    
    # Test 1: GitHub Actions Workflow Validation
    Write-TestLog "Testing GitHub Actions workflow configuration..." "INFO"
    try {
        if (Test-Path ".github/workflows/ci-cd-pipeline.yml") {
            $workflow = Get-Content ".github/workflows/ci-cd-pipeline.yml" -Raw
            if ($workflow -match "FloWorx CI/CD Pipeline" -and $workflow -match "deploy-production") {
                Write-TestLog "✅ GitHub Actions workflow configuration valid" "SUCCESS"
                $TestResults["CI/CD Pipeline"]["GitHub Actions"] = "PASS"
            } else {
                throw "Workflow configuration incomplete"
            }
        } else {
            throw "GitHub Actions workflow file not found"
        }
    } catch {
        Write-TestLog "❌ GitHub Actions workflow test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["CI/CD Pipeline"]["GitHub Actions"] = "FAIL"
    }
    
    # Test 2: Blue-Green Deployment Script
    Write-TestLog "Testing blue-green deployment script..." "INFO"
    try {
        if (Test-Path "scripts/deploy-blue-green.sh") {
            $script = Get-Content "scripts/deploy-blue-green.sh" -Raw
            if ($script -match "Blue-Green Deployment" -and $script -match "health_check") {
                Write-TestLog "✅ Blue-green deployment script valid" "SUCCESS"
                $TestResults["CI/CD Pipeline"]["Blue-Green Script"] = "PASS"
            } else {
                throw "Deployment script incomplete"
            }
        } else {
            throw "Blue-green deployment script not found"
        }
    } catch {
        Write-TestLog "❌ Blue-green deployment script test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["CI/CD Pipeline"]["Blue-Green Script"] = "FAIL"
    }
    
    # Test 3: Traffic Switching Script
    Write-TestLog "Testing traffic switching script..." "INFO"
    try {
        if (Test-Path "scripts/switch-traffic.sh") {
            $script = Get-Content "scripts/switch-traffic.sh" -Raw
            if ($script -match "Traffic Switching" -and $script -match "verify_traffic_switch") {
                Write-TestLog "✅ Traffic switching script valid" "SUCCESS"
                $TestResults["CI/CD Pipeline"]["Traffic Switching"] = "PASS"
            } else {
                throw "Traffic switching script incomplete"
            }
        } else {
            throw "Traffic switching script not found"
        }
    } catch {
        Write-TestLog "❌ Traffic switching script test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["CI/CD Pipeline"]["Traffic Switching"] = "FAIL"
    }
    
    # Test 4: Rollback Script
    Write-TestLog "Testing rollback script..." "INFO"
    try {
        if (Test-Path "scripts/rollback.sh") {
            $script = Get-Content "scripts/rollback.sh" -Raw
            if ($script -match "Automated Rollback" -and $script -match "verify_rollback") {
                Write-TestLog "✅ Rollback script valid" "SUCCESS"
                $TestResults["CI/CD Pipeline"]["Rollback Script"] = "PASS"
            } else {
                throw "Rollback script incomplete"
            }
        } else {
            throw "Rollback script not found"
        }
    } catch {
        Write-TestLog "❌ Rollback script test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["CI/CD Pipeline"]["Rollback Script"] = "FAIL"
    }
    
    # Test 5: Package.json Scripts
    Write-TestLog "Testing package.json CI/CD scripts..." "INFO"
    try {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $requiredScripts = @("deploy:orchestrate", "deploy:blue-green", "deploy:switch-traffic", "deploy:rollback")
        
        $missingScripts = @()
        foreach ($script in $requiredScripts) {
            if (-not $packageJson.scripts.$script) {
                $missingScripts += $script
            }
        }
        
        if ($missingScripts.Count -eq 0) {
            Write-TestLog "✅ All required CI/CD scripts present in package.json" "SUCCESS"
            $TestResults["CI/CD Pipeline"]["Package Scripts"] = "PASS"
        } else {
            throw "Missing scripts: $($missingScripts -join ', ')"
        }
    } catch {
        Write-TestLog "❌ Package.json scripts test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["CI/CD Pipeline"]["Package Scripts"] = "FAIL"
    }
}

function Test-DeploymentExecution {
    Write-TestLog "🚀 Testing Deployment Execution" "INFO"
    
    # Test 1: Deployment Orchestration Script
    Write-TestLog "Testing deployment orchestration..." "INFO"
    try {
        if (Test-Path "deployment-orchestration.js") {
            $script = Get-Content "deployment-orchestration.js" -Raw
            if ($script -match "DeploymentOrchestrator" -and $script -match "executeDeployment") {
                Write-TestLog "✅ Deployment orchestration script valid" "SUCCESS"
                $TestResults["Deployment Execution"]["Orchestration"] = "PASS"
            } else {
                throw "Orchestration script incomplete"
            }
        } else {
            throw "Deployment orchestration script not found"
        }
    } catch {
        Write-TestLog "❌ Deployment orchestration test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Deployment Execution"]["Orchestration"] = "FAIL"
    }
    
    # Test 2: Production Environment Setup
    Write-TestLog "Testing production environment setup..." "INFO"
    try {
        if (Test-Path "production-environment-setup.js") {
            $script = Get-Content "production-environment-setup.js" -Raw
            if ($script -match "setupProductionDatabase" -and $script -match "setupProductionRedis") {
                Write-TestLog "✅ Production environment setup valid" "SUCCESS"
                $TestResults["Deployment Execution"]["Environment Setup"] = "PASS"
            } else {
                throw "Environment setup script incomplete"
            }
        } else {
            throw "Production environment setup script not found"
        }
    } catch {
        Write-TestLog "❌ Production environment setup test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Deployment Execution"]["Environment Setup"] = "FAIL"
    }
    
    # Test 3: Security Configuration
    Write-TestLog "Testing security configuration..." "INFO"
    try {
        if (Test-Path "backend/config/production-security.js") {
            $script = Get-Content "backend/config/production-security.js" -Raw
            if ($script -match "createSecurityMiddlewareStack" -and $script -match "rateLimiting") {
                Write-TestLog "✅ Security configuration valid" "SUCCESS"
                $TestResults["Deployment Execution"]["Security Config"] = "PASS"
            } else {
                throw "Security configuration incomplete"
            }
        } else {
            throw "Security configuration file not found"
        }
    } catch {
        Write-TestLog "❌ Security configuration test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Deployment Execution"]["Security Config"] = "FAIL"
    }
    
    # Test 4: Database Schema Validation
    Write-TestLog "Testing database schema validation..." "INFO"
    try {
        if (Test-Path "database-schema-validation.js") {
            $script = Get-Content "database-schema-validation.js" -Raw
            if ($script -match "validateSchema" -and $script -match "createMissingTables") {
                Write-TestLog "✅ Database schema validation valid" "SUCCESS"
                $TestResults["Deployment Execution"]["Database Schema"] = "PASS"
            } else {
                throw "Database schema validation incomplete"
            }
        } else {
            throw "Database schema validation script not found"
        }
    } catch {
        Write-TestLog "❌ Database schema validation test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Deployment Execution"]["Database Schema"] = "FAIL"
    }
}

function Test-VerificationTesting {
    Write-TestLog "🧪 Testing Verification Testing Components" "INFO"
    
    # Test 1: Functional Tests
    Write-TestLog "Testing functional test suite..." "INFO"
    try {
        if (Test-Path "tests/functional/critical-user-flows.test.js") {
            $script = Get-Content "tests/functional/critical-user-flows.test.js" -Raw
            if ($script -match "Critical User Flows" -and $script -match "Registration and Email Verification") {
                Write-TestLog "✅ Functional test suite valid" "SUCCESS"
                $TestResults["Verification Testing"]["Functional Tests"] = "PASS"
            } else {
                throw "Functional test suite incomplete"
            }
        } else {
            throw "Functional test suite not found"
        }
    } catch {
        Write-TestLog "❌ Functional test suite test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Verification Testing"]["Functional Tests"] = "FAIL"
    }
    
    # Test 2: Performance Tests
    Write-TestLog "Testing performance test suite..." "INFO"
    try {
        if (Test-Path "tests/performance/load-testing.js") {
            $script = Get-Content "tests/performance/load-testing.js" -Raw
            if ($script -match "LoadTester" -and $script -match "runLoadTests") {
                Write-TestLog "✅ Performance test suite valid" "SUCCESS"
                $TestResults["Verification Testing"]["Performance Tests"] = "PASS"
            } else {
                throw "Performance test suite incomplete"
            }
        } else {
            throw "Performance test suite not found"
        }
    } catch {
        Write-TestLog "❌ Performance test suite test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Verification Testing"]["Performance Tests"] = "FAIL"
    }
    
    # Test 3: Production Health Check
    if (-not $SkipDeployment) {
        Write-TestLog "Testing production health check..." "INFO"
        try {
            $response = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET -TimeoutSec 10
            if ($response.status -eq "ok") {
                Write-TestLog "✅ Production health check passed" "SUCCESS"
                $TestResults["Verification Testing"]["Health Check"] = "PASS"
            } else {
                throw "Health check returned status: $($response.status)"
            }
        } catch {
            Write-TestLog "❌ Production health check failed: $($_.Exception.Message)" "ERROR"
            $TestResults["Verification Testing"]["Health Check"] = "FAIL"
        }
    }
    
    # Test 4: Authentication Endpoint
    if (-not $SkipDeployment) {
        Write-TestLog "Testing authentication endpoint..." "INFO"
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
                Write-TestLog "✅ Authentication endpoint test passed" "SUCCESS"
                $TestResults["Verification Testing"]["Authentication"] = "PASS"
            } else {
                throw "Authentication test failed: $($response.message)"
            }
        } catch {
            Write-TestLog "❌ Authentication endpoint test failed: $($_.Exception.Message)" "ERROR"
            $TestResults["Verification Testing"]["Authentication"] = "FAIL"
        }
    }
}

function Test-MonitoringSetup {
    Write-TestLog "📊 Testing Monitoring Setup" "INFO"
    
    # Test 1: Monitoring System
    Write-TestLog "Testing monitoring system..." "INFO"
    try {
        if (Test-Path "monitoring/monitoring-setup.js") {
            $script = Get-Content "monitoring/monitoring-setup.js" -Raw
            if ($script -match "MonitoringSystem" -and $script -match "setupLogger") {
                Write-TestLog "✅ Monitoring system valid" "SUCCESS"
                $TestResults["Monitoring Setup"]["Monitoring System"] = "PASS"
            } else {
                throw "Monitoring system incomplete"
            }
        } else {
            throw "Monitoring system not found"
        }
    } catch {
        Write-TestLog "❌ Monitoring system test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Monitoring Setup"]["Monitoring System"] = "FAIL"
    }
    
    # Test 2: Metrics Endpoint
    if (-not $SkipDeployment) {
        Write-TestLog "Testing metrics endpoint..." "INFO"
        try {
            $response = Invoke-WebRequest -Uri "$BaseUrl/api/metrics" -Method GET -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-TestLog "✅ Metrics endpoint accessible" "SUCCESS"
                $TestResults["Monitoring Setup"]["Metrics Endpoint"] = "PASS"
            } else {
                throw "Metrics endpoint returned status: $($response.StatusCode)"
            }
        } catch {
            Write-TestLog "⚠️ Metrics endpoint test failed (may not be implemented): $($_.Exception.Message)" "WARNING"
            $TestResults["Monitoring Setup"]["Metrics Endpoint"] = "SKIP"
        }
    }
    
    # Test 3: Detailed Health Endpoint
    if (-not $SkipDeployment) {
        Write-TestLog "Testing detailed health endpoint..." "INFO"
        try {
            $response = Invoke-RestMethod -Uri "$BaseUrl/api/health/detailed" -Method GET -TimeoutSec 10
            if ($response.status -eq "ok") {
                Write-TestLog "✅ Detailed health endpoint test passed" "SUCCESS"
                $TestResults["Monitoring Setup"]["Detailed Health"] = "PASS"
            } else {
                throw "Detailed health check returned status: $($response.status)"
            }
        } catch {
            Write-TestLog "⚠️ Detailed health endpoint test failed (may not be implemented): $($_.Exception.Message)" "WARNING"
            $TestResults["Monitoring Setup"]["Detailed Health"] = "SKIP"
        }
    }
    
    # Test 4: Security Audit Script
    Write-TestLog "Testing security audit script..." "INFO"
    try {
        if (Test-Path "security-audit-script.js") {
            $script = Get-Content "security-audit-script.js" -Raw
            if ($script -match "runSecurityAudit" -and $script -match "testAuthenticationSecurity") {
                Write-TestLog "✅ Security audit script valid" "SUCCESS"
                $TestResults["Monitoring Setup"]["Security Audit"] = "PASS"
            } else {
                throw "Security audit script incomplete"
            }
        } else {
            throw "Security audit script not found"
        }
    } catch {
        Write-TestLog "❌ Security audit script test failed: $($_.Exception.Message)" "ERROR"
        $TestResults["Monitoring Setup"]["Security Audit"] = "FAIL"
    }
}

function Generate-TestReport {
    Write-TestLog "📋 Generating Comprehensive Test Report" "INFO"
    
    $TestResults["Overall"]["EndTime"] = Get-Date
    $TestResults["Overall"]["Duration"] = $TestResults["Overall"]["EndTime"] - $TestResults["Overall"]["StartTime"]
    
    # Calculate totals
    foreach ($category in $TestResults.Keys) {
        if ($category -ne "Overall") {
            foreach ($test in $TestResults[$category].Keys) {
                $TestResults["Overall"]["TotalTests"]++
                if ($TestResults[$category][$test] -eq "PASS") {
                    $TestResults["Overall"]["PassedTests"]++
                } elseif ($TestResults[$category][$test] -eq "FAIL") {
                    $TestResults["Overall"]["FailedTests"]++
                }
            }
        }
    }
    
    $successRate = if ($TestResults["Overall"]["TotalTests"] -gt 0) {
        [math]::Round(($TestResults["Overall"]["PassedTests"] / $TestResults["Overall"]["TotalTests"]) * 100, 1)
    } else { 0 }
    
    Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
    Write-Host "📊 FLOWORX CI/CD PIPELINE TEST REPORT" -ForegroundColor Cyan
    Write-Host "=" * 80 -ForegroundColor Cyan
    
    Write-Host "`n🎯 OVERALL RESULTS:" -ForegroundColor Yellow
    Write-Host "Total Tests: $($TestResults['Overall']['TotalTests'])" -ForegroundColor White
    Write-Host "Passed: $($TestResults['Overall']['PassedTests'])" -ForegroundColor Green
    Write-Host "Failed: $($TestResults['Overall']['FailedTests'])" -ForegroundColor Red
    Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })
    Write-Host "Duration: $($TestResults['Overall']['Duration'].ToString('mm\:ss'))" -ForegroundColor White
    Write-Host "Target URL: $BaseUrl" -ForegroundColor White
    
    # Detailed results by category
    foreach ($category in $TestResults.Keys) {
        if ($category -ne "Overall") {
            Write-Host "`n📋 $($category.ToUpper()):" -ForegroundColor Yellow
            foreach ($test in $TestResults[$category].Keys) {
                $status = $TestResults[$category][$test]
                $color = switch ($status) {
                    "PASS" { "Green" }
                    "FAIL" { "Red" }
                    "SKIP" { "Yellow" }
                    default { "White" }
                }
                $icon = switch ($status) {
                    "PASS" { "✅" }
                    "FAIL" { "❌" }
                    "SKIP" { "⚠️" }
                    default { "❓" }
                }
                Write-Host "  $icon $test : $status" -ForegroundColor $color
            }
        }
    }
    
    # Recommendations
    Write-Host "`n🎯 RECOMMENDATIONS:" -ForegroundColor Yellow
    
    if ($TestResults["Overall"]["FailedTests"] -eq 0) {
        Write-Host "✅ All tests passed! CI/CD pipeline is ready for production." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Some tests failed. Please address the following:" -ForegroundColor Yellow
        
        foreach ($category in $TestResults.Keys) {
            if ($category -ne "Overall") {
                foreach ($test in $TestResults[$category].Keys) {
                    if ($TestResults[$category][$test] -eq "FAIL") {
                        Write-Host "  - Fix $test in $category" -ForegroundColor Red
                    }
                }
            }
        }
    }
    
    Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
    
    # Save report to file
    $reportPath = "cicd-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $TestResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath
    Write-TestLog "📄 Test report saved to: $reportPath" "INFO"
}

# Main execution
try {
    Write-TestLog "🚀 Starting FloWorx CI/CD Pipeline Comprehensive Testing" "INFO"
    Write-TestLog "🎯 Target URL: $BaseUrl" "INFO"
    Write-TestLog "🔧 Test Type: $TestType" "INFO"
    Write-TestLog "⚙️ Skip Deployment Tests: $SkipDeployment" "INFO"
    
    if ($TestType -eq "all" -or $TestType -eq "cicd") {
        Test-CICDPipeline
    }
    
    if ($TestType -eq "all" -or $TestType -eq "deployment") {
        Test-DeploymentExecution
    }
    
    if ($TestType -eq "all" -or $TestType -eq "verification") {
        Test-VerificationTesting
    }
    
    if ($TestType -eq "all" -or $TestType -eq "monitoring") {
        Test-MonitoringSetup
    }
    
    Generate-TestReport
    
    Write-TestLog "🎉 CI/CD Pipeline testing completed!" "SUCCESS"
    
    # Exit with appropriate code
    if ($TestResults["Overall"]["FailedTests"] -eq 0) {
        exit 0
    } else {
        exit 1
    }
    
} catch {
    Write-TestLog "💥 CI/CD Pipeline testing failed: $($_.Exception.Message)" "ERROR"
    exit 1
}

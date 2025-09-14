#!/usr/bin/env pwsh

Write-Host "🔍 PRODUCTION STATUS DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host ""

$baseUrl = "https://app.floworx-iq.com"
$testResults = @{
    healthCheck = $false
    registration = $false
    emailProvider = $false
    overallStatus = "UNKNOWN"
}

# Test 1: Basic connectivity
Write-Host "🌐 Testing basic connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Basic connectivity: OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Basic connectivity: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 2: Health check endpoint
Write-Host "`n🏥 Testing health check endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 15 -ErrorAction Stop
    Write-Host "✅ Health check: $($healthResponse.status)" -ForegroundColor Green
    $testResults.healthCheck = $true
} catch {
    Write-Host "❌ Health check: FAILED" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 3: Test registration endpoint
Write-Host "`n👤 Testing registration endpoint..." -ForegroundColor Yellow
$testEmail = "diagnostic-test-$(Get-Random)@example.com"
$registrationData = @{
    email = $testEmail
    password = "TestPassword123!"
    firstName = "Diagnostic"
    lastName = "Test"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/test-register" -Method POST -Body $registrationData -ContentType "application/json" -TimeoutSec 20 -ErrorAction Stop
    Write-Host "✅ Registration: WORKING" -ForegroundColor Green
    Write-Host "   User ID: $($regResponse.data.user.id)" -ForegroundColor Gray
    Write-Host "   Token: $($regResponse.data.token.Substring(0, 30))..." -ForegroundColor Gray
    $testResults.registration = $true
    $token = $regResponse.data.token
} catch {
    Write-Host "❌ Registration: FAILED" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 4: Email provider selection (if registration worked)
if ($testResults.registration -and $token) {
    Write-Host "`n📧 Testing email provider selection..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $emailData = @{ provider = "gmail" } | ConvertTo-Json
    
    try {
        $emailResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailData -Headers $headers -TimeoutSec 15 -ErrorAction Stop
        Write-Host "✅ Email provider selection: WORKING" -ForegroundColor Green
        Write-Host "   Provider: $($emailResponse.data.provider)" -ForegroundColor Gray
        $testResults.emailProvider = $true
    } catch {
        Write-Host "❌ Email provider selection: FAILED" -ForegroundColor Red
        Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
} else {
    Write-Host "`n⏭️ Skipping email provider test (registration failed)" -ForegroundColor Yellow
}

# Test 5: Check for deployment issues
Write-Host "`n🔧 Checking for deployment issues..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5
    $headers = $response.Headers
    
    Write-Host "Response Headers:" -ForegroundColor Gray
    if ($headers["Server"]) {
        Write-Host "   Server: $($headers["Server"])" -ForegroundColor Gray
    }
    if ($headers["X-Powered-By"]) {
        Write-Host "   X-Powered-By: $($headers["X-Powered-By"])" -ForegroundColor Gray
    }
    if ($headers["Content-Type"]) {
        Write-Host "   Content-Type: $($headers["Content-Type"])" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Could not retrieve headers" -ForegroundColor Red
}

# Determine overall status
if ($testResults.healthCheck -and $testResults.registration -and $testResults.emailProvider) {
    $testResults.overallStatus = "FULLY_OPERATIONAL"
    $statusColor = "Green"
    $statusIcon = "🎉"
} elseif ($testResults.healthCheck -and $testResults.registration) {
    $testResults.overallStatus = "MOSTLY_OPERATIONAL"
    $statusColor = "Yellow"
    $statusIcon = "⚠️"
} elseif ($testResults.healthCheck) {
    $testResults.overallStatus = "PARTIALLY_OPERATIONAL"
    $statusColor = "Yellow"
    $statusIcon = "⚠️"
} else {
    $testResults.overallStatus = "SERVICE_UNAVAILABLE"
    $statusColor = "Red"
    $statusIcon = "❌"
}

# Final report
Write-Host "`n" + "=" * 50 -ForegroundColor Gray
Write-Host "📊 DIAGNOSTIC RESULTS" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

Write-Host "`n🏥 Health Check: $(if ($testResults.healthCheck) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "👤 Registration: $(if ($testResults.registration) { '✅ PASS' } else { '❌ FAIL' })"
Write-Host "📧 Email Provider: $(if ($testResults.emailProvider) { '✅ PASS' } else { '❌ FAIL' })"

Write-Host "`n$statusIcon OVERALL STATUS: $($testResults.overallStatus)" -ForegroundColor $statusColor

if ($testResults.overallStatus -eq "SERVICE_UNAVAILABLE") {
    Write-Host "`n🚨 CRITICAL ISSUES DETECTED:" -ForegroundColor Red
    Write-Host "   - Service is not responding to health checks" -ForegroundColor Red
    Write-Host "   - This indicates a deployment or configuration issue" -ForegroundColor Red
    Write-Host "   - Check Coolify deployment logs for errors" -ForegroundColor Red
    Write-Host "   - Verify environment variables are properly set" -ForegroundColor Red
} elseif ($testResults.overallStatus -eq "PARTIALLY_OPERATIONAL") {
    Write-Host "`n⚠️ PARTIAL FUNCTIONALITY:" -ForegroundColor Yellow
    Write-Host "   - Basic health check is working" -ForegroundColor Yellow
    Write-Host "   - Authentication endpoints may have issues" -ForegroundColor Yellow
    Write-Host "   - Check authentication endpoint logs" -ForegroundColor Yellow
} elseif ($testResults.overallStatus -eq "MOSTLY_OPERATIONAL") {
    Write-Host "`n✅ CORE FUNCTIONALITY WORKING:" -ForegroundColor Green
    Write-Host "   - Health check and registration are operational" -ForegroundColor Green
    Write-Host "   - Email provider selection may need attention" -ForegroundColor Green
} else {
    Write-Host "`n🎉 ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host "   - FloWorx is ready for production use" -ForegroundColor Green
    Write-Host "   - All core features are working correctly" -ForegroundColor Green
}

Write-Host "`n🔗 Application URL: $baseUrl" -ForegroundColor Cyan
Write-Host "📅 Test completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "=" * 50 -ForegroundColor Gray

# Return appropriate exit code
if ($testResults.overallStatus -eq "FULLY_OPERATIONAL") {
    exit 0
} elseif ($testResults.overallStatus -eq "MOSTLY_OPERATIONAL") {
    exit 1
} else {
    exit 2
}

# Simple Production Test - Diagnose Issues
$baseUrl = "https://app.floworx-iq.com"

Write-Host "🔍 Diagnosing Production Issues" -ForegroundColor Yellow

# Test 1: Basic Health Check
Write-Host "`n1️⃣ Health Check..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ API is responding" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Database Connection Test
Write-Host "`n2️⃣ Database Connection..." -ForegroundColor Cyan
try {
    $businessTypes = Invoke-RestMethod -Uri "$baseUrl/api/business-types" -Method GET
    Write-Host "✅ Database connected" -ForegroundColor Green
    Write-Host "   Business Types: $($businessTypes.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Database connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check if email_provider column exists
Write-Host "`n3️⃣ Testing Database Schema..." -ForegroundColor Cyan
try {
    # Try to register a user to see what error we get
    $testData = @{
        email = "schema-test-$(Get-Random)@example.com"
        password = "TestPassword123!"
        firstName = "Schema"
        lastName = "Test"
        companyName = "Test Company"
        agreeToTerms = $true
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $testData -ContentType "application/json"
    Write-Host "✅ User registration works" -ForegroundColor Green
    
    # If registration works, try to get onboarding status
    $headers = @{
        "Authorization" = "Bearer $($response.data.token)"
        "Content-Type" = "application/json"
    }
    
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Onboarding status works" -ForegroundColor Green
    Write-Host "   Email Provider: $($status.emailProvider)" -ForegroundColor Gray
    Write-Host "   Next Step: $($status.nextStep)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Schema issue detected" -ForegroundColor Red
    $errorDetails = $_.Exception.Response
    if ($errorDetails) {
        $reader = New-Object System.IO.StreamReader($errorDetails.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error Details: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Check specific endpoints
Write-Host "`n4️⃣ Testing Specific Endpoints..." -ForegroundColor Cyan

# Test onboarding status without auth (should fail with 401, not 500)
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET
    Write-Host "⚠️ Onboarding status accessible without auth" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq "Unauthorized") {
        Write-Host "✅ Onboarding status properly protected (401)" -ForegroundColor Green
    } elseif ($statusCode -eq "InternalServerError") {
        Write-Host "❌ Onboarding status returns 500 (database issue)" -ForegroundColor Red
    } else {
        Write-Host "⚠️ Onboarding status returns: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Diagnosis Complete" -ForegroundColor Green
Write-Host "If you see 500 errors, the database migration likely needs to be applied to production." -ForegroundColor Yellow

# FloWorx Production Deployment Test Script
# Tests the deployed email provider functionality

$baseUrl = "https://app.floworx-iq.com"
$testEmail = "test-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "🚀 Testing FloWorx Production Deployment" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1️⃣ Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
    Write-Host "   Version: $($health.version)" -ForegroundColor Gray
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Business Types
Write-Host "`n2️⃣ Testing Business Types..." -ForegroundColor Yellow
try {
    $businessTypes = Invoke-RestMethod -Uri "$baseUrl/api/business-types" -Method GET
    Write-Host "✅ Business Types: $($businessTypes.data.Count) types available" -ForegroundColor Green
    $generalContractor = $businessTypes.data | Where-Object { $_.name -eq "General Contractor" }
    if ($generalContractor) {
        Write-Host "   Found General Contractor (ID: $($generalContractor.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Business Types Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: User Registration
Write-Host "`n3️⃣ Testing User Registration..." -ForegroundColor Yellow
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    companyName = "Test Company"
    agreeToTerms = $true
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "✅ User Registration: Success" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
    $userId = $registerResponse.data.user.id
    $authToken = $registerResponse.data.token
} catch {
    Write-Host "❌ User Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    # Try to login instead
    Write-Host "   Attempting login..." -ForegroundColor Yellow
    $loginData = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        Write-Host "✅ User Login: Success" -ForegroundColor Green
        $userId = $loginResponse.data.user.id
        $authToken = $loginResponse.data.token
    } catch {
        Write-Host "❌ Login also failed, creating new user..." -ForegroundColor Red
        $testEmail = "test-$(Get-Random)-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        $registerData = @{
            email = $testEmail
            password = $testPassword
            firstName = "Test"
            lastName = "User"
            companyName = "Test Company"
            agreeToTerms = $true
        } | ConvertTo-Json
        
        $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
        $userId = $registerResponse.data.user.id
        $authToken = $registerResponse.data.token
        Write-Host "✅ New User Created: $testEmail" -ForegroundColor Green
    }
}

# Test 4: Onboarding Status (Before Email Provider Selection)
Write-Host "`n4️⃣ Testing Onboarding Status (Initial)..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

try {
    $onboardingStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Onboarding Status: Success" -ForegroundColor Green
    Write-Host "   Email Provider: $($onboardingStatus.emailProvider)" -ForegroundColor Gray
    Write-Host "   Business Type ID: $($onboardingStatus.businessTypeId)" -ForegroundColor Gray
    Write-Host "   Next Step: $($onboardingStatus.nextStep)" -ForegroundColor Gray
    Write-Host "   Onboarding Complete: $($onboardingStatus.onboardingComplete)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Onboarding Status Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Red
}

# Test 5: Email Provider Selection
Write-Host "`n5️⃣ Testing Email Provider Selection..." -ForegroundColor Yellow
$emailProviderData = @{
    emailProvider = "gmail"
} | ConvertTo-Json

try {
    $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
    Write-Host "✅ Email Provider Selection: Success" -ForegroundColor Green
    Write-Host "   Selected: gmail" -ForegroundColor Gray
    Write-Host "   Message: $($emailProviderResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Email Provider Selection Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 6: Business Type Selection
Write-Host "`n6️⃣ Testing Business Type Selection..." -ForegroundColor Yellow
$businessTypeData = @{
    businessTypeId = $generalContractor.id
} | ConvertTo-Json

try {
    $businessTypeResponse = Invoke-RestMethod -Uri "$baseUrl/api/business-types/select" -Method POST -Body $businessTypeData -Headers $headers
    Write-Host "✅ Business Type Selection: Success" -ForegroundColor Green
    Write-Host "   Selected: General Contractor" -ForegroundColor Gray
} catch {
    Write-Host "❌ Business Type Selection Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Final Onboarding Status
Write-Host "`n7️⃣ Testing Final Onboarding Status..." -ForegroundColor Yellow
try {
    $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Final Onboarding Status: Success" -ForegroundColor Green
    Write-Host "   Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
    Write-Host "   Business Type ID: $($finalStatus.businessTypeId)" -ForegroundColor Gray
    Write-Host "   Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
    Write-Host "   Onboarding Complete: $($finalStatus.onboardingComplete)" -ForegroundColor Gray
    
    if ($finalStatus.emailProvider -eq "gmail" -and $finalStatus.businessTypeId -eq $generalContractor.id) {
        Write-Host "✅ Email Provider Flow: COMPLETE" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Email Provider Flow: INCOMPLETE" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Final Onboarding Status Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Production Deployment Test Complete!" -ForegroundColor Green
Write-Host "Test User: $testEmail" -ForegroundColor Cyan
Write-Host "User ID: $userId" -ForegroundColor Cyan

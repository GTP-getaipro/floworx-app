# Test Production with Proper Authentication
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "test-auth-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "🚀 Testing FloWorx Production with Proper Authentication" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1️⃣ Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: User Registration with proper data
Write-Host "`n2️⃣ Testing User Registration..." -ForegroundColor Yellow
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
    Write-Host "   Auth Token: $($authToken.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ User Registration Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ User Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Onboarding Status with Authentication
Write-Host "`n3️⃣ Testing Onboarding Status (With Auth)..." -ForegroundColor Yellow
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
    
    if ($onboardingStatus.nextStep -eq "email-provider") {
        Write-Host "✅ Migration Applied: Next step is email-provider selection" -ForegroundColor Green
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ Onboarding Status Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ Onboarding Status Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Email Provider Selection
Write-Host "`n4️⃣ Testing Email Provider Selection..." -ForegroundColor Yellow
$emailProviderData = @{
    emailProvider = "gmail"
} | ConvertTo-Json

try {
    $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
    Write-Host "✅ Email Provider Selection: Success" -ForegroundColor Green
    Write-Host "   Selected: gmail" -ForegroundColor Gray
    Write-Host "   Message: $($emailProviderResponse.message)" -ForegroundColor Gray
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ Email Provider Selection Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ Email Provider Selection Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Business Type Selection
Write-Host "`n5️⃣ Testing Business Type Selection..." -ForegroundColor Yellow
$businessTypeData = @{
    businessTypeId = 6  # General Contractor
} | ConvertTo-Json

try {
    $businessTypeResponse = Invoke-RestMethod -Uri "$baseUrl/api/business-types/select" -Method POST -Body $businessTypeData -Headers $headers
    Write-Host "✅ Business Type Selection: Success" -ForegroundColor Green
    Write-Host "   Selected: General Contractor (ID: 6)" -ForegroundColor Gray
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ Business Type Selection Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ Business Type Selection Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 6: Final Onboarding Status
Write-Host "`n6️⃣ Testing Final Onboarding Status..." -ForegroundColor Yellow
try {
    $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "✅ Final Onboarding Status: Success" -ForegroundColor Green
    Write-Host "   Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
    Write-Host "   Business Type ID: $($finalStatus.businessTypeId)" -ForegroundColor Gray
    Write-Host "   Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
    Write-Host "   Onboarding Complete: $($finalStatus.onboardingComplete)" -ForegroundColor Gray
    
    if ($finalStatus.emailProvider -eq "gmail" -and $finalStatus.businessTypeId -eq 6) {
        Write-Host "🎉 EMAIL PROVIDER FLOW: COMPLETE SUCCESS!" -ForegroundColor Green
        Write-Host "   ✅ Email provider saved: gmail" -ForegroundColor Green
        Write-Host "   ✅ Business type saved: General Contractor" -ForegroundColor Green
        Write-Host "   ✅ Next step: $($finalStatus.nextStep)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Email Provider Flow: Partially working" -ForegroundColor Yellow
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ Final Onboarding Status Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ Final Onboarding Status Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Production Authentication Test Complete!" -ForegroundColor Green
Write-Host "Test User: $testEmail" -ForegroundColor Cyan
Write-Host "User ID: $userId" -ForegroundColor Cyan

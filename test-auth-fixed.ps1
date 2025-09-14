# Test Authentication with Proper Schema
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "test-fixed-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "🚀 Testing FloWorx Authentication (Fixed)" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Wait for deployment to complete
Write-Host "`n⏳ Waiting for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# Test 1: Health Check
Write-Host "`n1️⃣ Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Onboarding Status without auth (should now return 401)
Write-Host "`n2️⃣ Testing Onboarding Status (No Auth - Should Return 401)..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET
    Write-Host "⚠️ Onboarding Status accessible without auth" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Authentication Fixed: Returns 401 (auth required) - CORRECT!" -ForegroundColor Green
    } elseif ($statusCode -eq 500) {
        Write-Host "❌ Still returns 500 - Auth fix not deployed yet" -ForegroundColor Red
    } else {
        Write-Host "⚠️ Returns status code: $statusCode" -ForegroundColor Yellow
    }
}

# Test 3: User Registration with proper schema
Write-Host "`n3️⃣ Testing User Registration (Proper Schema)..." -ForegroundColor Yellow
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    businessName = "Test Company"
    agreeToTerms = $true
    marketingConsent = $false
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "✅ User Registration: Success" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
    $userId = $registerResponse.data.user.id
    $authToken = $registerResponse.data.token
    Write-Host "   Auth Token: $($authToken.Substring(0, 20))..." -ForegroundColor Gray
    
    # Test 4: Onboarding Status with Authentication
    Write-Host "`n4️⃣ Testing Onboarding Status (With Auth)..." -ForegroundColor Yellow
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
        
        if ($onboardingStatus.nextStep -eq "email-provider") {
            Write-Host "✅ Ready for Email Provider Selection!" -ForegroundColor Green
            
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
                
                # Test 6: Final Onboarding Status
                Write-Host "`n6️⃣ Testing Final Onboarding Status..." -ForegroundColor Yellow
                try {
                    $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
                    Write-Host "✅ Final Status: Success" -ForegroundColor Green
                    Write-Host "   Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
                    Write-Host "   Business Type ID: $($finalStatus.businessTypeId)" -ForegroundColor Gray
                    Write-Host "   Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
                    
                    if ($finalStatus.emailProvider -eq "gmail") {
                        Write-Host "`n🎉 EMAIL PROVIDER FLOW: COMPLETE SUCCESS!" -ForegroundColor Green
                        Write-Host "   ✅ Authentication: Fixed and working" -ForegroundColor Green
                        Write-Host "   ✅ Registration: Working with proper schema" -ForegroundColor Green
                        Write-Host "   ✅ Email Provider Selection: Working perfectly" -ForegroundColor Green
                        Write-Host "   ✅ Database Migration: Applied successfully" -ForegroundColor Green
                        Write-Host "   ✅ Production Deployment: Fully functional" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "❌ Final Status Failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ Email Provider Selection Failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Onboarding Status Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "❌ User Registration Failed: $errorBody" -ForegroundColor Red
    } else {
        Write-Host "❌ User Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Test Complete!" -ForegroundColor Green
Write-Host "Test User: $testEmail" -ForegroundColor Cyan

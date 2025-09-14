# Comprehensive Registration and Login Testing
$baseUrl = "https://app.floworx-iq.com"

Write-Host "🔍 FloWorx Registration and Login Debug Test" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

# Test 1: Check registration schema requirements
Write-Host "`n1️⃣ Testing Registration Schema Validation" -ForegroundColor Yellow

# Test with minimal required fields
$minimalData = @{
    email = "minimal-$(Get-Random)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Testing minimal registration data..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $minimalData -ContentType "application/json"
    Write-Host "✅ Minimal registration: SUCCESS" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Minimal registration failed: $statusCode" -ForegroundColor Red
    
    # Try to get error details
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error details" -ForegroundColor Gray
    }
}

# Test with phone field (required by schema)
Write-Host "`nTesting with phone field..." -ForegroundColor Cyan
$withPhoneData = @{
    email = "withphone-$(Get-Random)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    agreeToTerms = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $withPhoneData -ContentType "application/json"
    Write-Host "✅ Registration with phone: SUCCESS" -ForegroundColor Green
    $registeredUser = $response
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Registration with phone failed: $statusCode" -ForegroundColor Red
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error details" -ForegroundColor Gray
    }
}

# Test with all fields
Write-Host "`nTesting with all fields..." -ForegroundColor Cyan
$fullData = @{
    email = "full-$(Get-Random)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    businessName = "Test Company"
    agreeToTerms = $true
    marketingConsent = $false
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $fullData -ContentType "application/json"
    Write-Host "✅ Full registration: SUCCESS" -ForegroundColor Green
    $fullRegisteredUser = $response
    Write-Host "User ID: $($response.data.user.id)" -ForegroundColor Gray
    Write-Host "Token: $($response.data.token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Full registration failed: $statusCode" -ForegroundColor Red
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error details" -ForegroundColor Gray
    }
}

# Test 2: Login Testing
Write-Host "`n2️⃣ Testing Login Functionality" -ForegroundColor Yellow

if ($fullRegisteredUser -and $fullRegisteredUser.data.user) {
    $testEmail = $fullRegisteredUser.data.user.email
    $testPassword = "TestPassword123!"
    
    Write-Host "Testing login with registered user: $testEmail" -ForegroundColor Cyan
    
    $loginData = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
        Write-Host "✅ Login: SUCCESS" -ForegroundColor Green
        Write-Host "Token: $($loginResponse.data.token.Substring(0, 20))..." -ForegroundColor Gray
        $authToken = $loginResponse.data.token
        
        # Test 3: Token Verification
        Write-Host "`n3️⃣ Testing Token Verification" -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $authToken"
            "Content-Type" = "application/json"
        }
        
        try {
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" -Method GET -Headers $headers
            Write-Host "✅ Token verification: SUCCESS" -ForegroundColor Green
            Write-Host "Verified user: $($verifyResponse.user.email)" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Token verification failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
        
        # Test 4: Onboarding with Authentication
        Write-Host "`n4️⃣ Testing Onboarding with Authentication" -ForegroundColor Yellow
        try {
            $onboardingStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
            Write-Host "✅ Onboarding status: SUCCESS" -ForegroundColor Green
            Write-Host "Email Provider: $($onboardingStatus.emailProvider)" -ForegroundColor Gray
            Write-Host "Next Step: $($onboardingStatus.nextStep)" -ForegroundColor Gray
            
            # Test 5: Email Provider Selection
            if ($onboardingStatus.nextStep -eq "email-provider") {
                Write-Host "`n5️⃣ Testing Email Provider Selection" -ForegroundColor Yellow
                $emailProviderData = @{
                    emailProvider = "gmail"
                } | ConvertTo-Json
                
                try {
                    $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
                    Write-Host "✅ Email Provider Selection: SUCCESS" -ForegroundColor Green
                    Write-Host "Selected: gmail" -ForegroundColor Gray
                    
                    # Final status check
                    Write-Host "`n6️⃣ Final Onboarding Status Check" -ForegroundColor Yellow
                    try {
                        $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
                        Write-Host "✅ Final status: SUCCESS" -ForegroundColor Green
                        Write-Host "Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
                        Write-Host "Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
                        
                        if ($finalStatus.emailProvider -eq "gmail") {
                            Write-Host "`n🎉 COMPLETE SUCCESS!" -ForegroundColor Green
                            Write-Host "✅ Registration: Working" -ForegroundColor Green
                            Write-Host "✅ Login: Working" -ForegroundColor Green
                            Write-Host "✅ Authentication: Working" -ForegroundColor Green
                            Write-Host "✅ Email Provider Selection: Working" -ForegroundColor Green
                        }
                    } catch {
                        Write-Host "❌ Final status failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
                    }
                } catch {
                    Write-Host "❌ Email Provider Selection failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "❌ Onboarding status failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "❌ Login failed: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Login error details: $errorBody" -ForegroundColor Gray
        } catch {
            Write-Host "Could not read login error details" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️ Skipping login test - no registered user available" -ForegroundColor Yellow
}

Write-Host "`n📊 Test Summary" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "This test checks registration, login, and email provider flow end-to-end" -ForegroundColor White

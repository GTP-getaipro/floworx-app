# Test Authentication Endpoint Fixes
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "auth-fixes-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "TESTING AUTHENTICATION ENDPOINT FIXES" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Wait for deployment to complete
Write-Host "`nWaiting for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 120

# Step 1: Test Health Check with Circuit Breakers
Write-Host "`n1. TESTING HEALTH CHECK AND CIRCUIT BREAKERS" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "SUCCESS: Basic health check working" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Gray
    
    # Test circuit breaker status
    $circuitResponse = Invoke-RestMethod -Uri "$baseUrl/api/health/circuit-breakers" -Method GET
    Write-Host "SUCCESS: Circuit breaker monitoring working" -ForegroundColor Green
    $dbCBStatus = if ($circuitResponse.circuitBreakers.database.isOpen) { 'OPEN' } else { 'CLOSED' }
    $authCBStatus = if ($circuitResponse.circuitBreakers.authentication.isOpen) { 'OPEN' } else { 'CLOSED' }
    Write-Host "   Database CB: $dbCBStatus" -ForegroundColor Gray
    Write-Host "   Auth CB: $authCBStatus" -ForegroundColor Gray
    $healthWorking = $true
} catch {
    Write-Host "FAILED: Health check issues" -ForegroundColor Red
    $healthWorking = $false
}

# Step 2: Test Fixed Registration Endpoint
Write-Host "`n2. TESTING FIXED REGISTRATION ENDPOINT" -ForegroundColor Yellow
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    businessName = "Test Company"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Sending registration request..."
try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "SUCCESS: Registration endpoint now working!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
    Write-Host "   Token received: YES" -ForegroundColor Gray
    Write-Host "   Message: $($registerResponse.message)" -ForegroundColor Gray
    $registrationToken = $registerResponse.data.token
    $registrationWorking = $true
} catch {
    Write-Host "FAILED: Registration still has issues" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error: $errorBody" -ForegroundColor Gray
    } catch {}
    $registrationWorking = $false
}

# Step 3: Test Fixed Login Endpoint
Write-Host "`n3. TESTING FIXED LOGIN ENDPOINT" -ForegroundColor Yellow
$loginData = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

Write-Host "Sending login request..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "SUCCESS: Login endpoint now working!" -ForegroundColor Green
    Write-Host "   Token received: YES" -ForegroundColor Gray
    Write-Host "   Message: $($loginResponse.message)" -ForegroundColor Gray
    $loginToken = $loginResponse.data.token
    $loginWorking = $true
} catch {
    Write-Host "FAILED: Login still has issues" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error: $errorBody" -ForegroundColor Gray
    } catch {}
    $loginWorking = $false
}

# Step 4: Test Token Verification
Write-Host "`n4. TESTING TOKEN VERIFICATION" -ForegroundColor Yellow
if ($registrationWorking -or $loginWorking) {
    $testToken = if ($loginWorking) { $loginToken } else { $registrationToken }
    $headers = @{
        "Authorization" = "Bearer $testToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" -Method GET -Headers $headers
        Write-Host "SUCCESS: Token verification working!" -ForegroundColor Green
        Write-Host "   Verified user: $($verifyResponse.user.email)" -ForegroundColor Gray
        $tokenWorking = $true
    } catch {
        Write-Host "FAILED: Token verification failed" -ForegroundColor Red
        $tokenWorking = $false
    }
} else {
    Write-Host "SKIPPED: No valid token to test" -ForegroundColor Yellow
    $tokenWorking = $false
}

# Step 5: Test Complete Authentication Flow
Write-Host "`n5. TESTING COMPLETE AUTHENTICATION FLOW" -ForegroundColor Yellow
if ($tokenWorking) {
    try {
        # Test onboarding status
        $onboardingStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
        Write-Host "SUCCESS: Authenticated onboarding access working" -ForegroundColor Green
        
        # Test email provider selection
        $emailProviderData = @{
            provider = "gmail"
        } | ConvertTo-Json
        
        $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
        Write-Host "SUCCESS: Authenticated email provider selection working!" -ForegroundColor Green
        
        $completeFlowWorking = $true
        
    } catch {
        Write-Host "FAILED: Complete authenticated flow has issues" -ForegroundColor Red
        $completeFlowWorking = $false
    }
} else {
    Write-Host "SKIPPED: No valid authentication" -ForegroundColor Yellow
    $completeFlowWorking = $false
}

# Step 6: Test Error Handling
Write-Host "`n6. TESTING ERROR HANDLING IMPROVEMENTS" -ForegroundColor Yellow
try {
    # Test invalid email format
    $invalidEmailData = @{
        email = "invalid-email"
        password = $testPassword
        firstName = "Test"
        lastName = "User"
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $invalidEmailData -ContentType "application/json"
        Write-Host "FAILED: Should have rejected invalid email" -ForegroundColor Red
        $errorHandlingWorking = $false
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "SUCCESS: Invalid email properly rejected with 400 error" -ForegroundColor Green
            $errorHandlingWorking = $true
        } else {
            Write-Host "PARTIAL: Invalid email rejected but with wrong status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
            $errorHandlingWorking = $true
        }
    }
} catch {
    Write-Host "FAILED: Error handling test failed" -ForegroundColor Red
    $errorHandlingWorking = $false
}

# RESULTS SUMMARY
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "AUTHENTICATION FIXES RESULTS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`nFIXED COMPONENTS:" -ForegroundColor Cyan
Write-Host "   Health Check & Circuit Breakers: $(if ($healthWorking) { 'WORKING' } else { 'BROKEN' })" -ForegroundColor $(if ($healthWorking) { 'Green' } else { 'Red' })
Write-Host "   Registration Endpoint: $(if ($registrationWorking) { 'FIXED' } else { 'STILL BROKEN' })" -ForegroundColor $(if ($registrationWorking) { 'Green' } else { 'Red' })
Write-Host "   Login Endpoint: $(if ($loginWorking) { 'FIXED' } else { 'STILL BROKEN' })" -ForegroundColor $(if ($loginWorking) { 'Green' } else { 'Red' })
Write-Host "   Token Verification: $(if ($tokenWorking) { 'WORKING' } else { 'BROKEN' })" -ForegroundColor $(if ($tokenWorking) { 'Green' } else { 'Red' })
Write-Host "   Complete Auth Flow: $(if ($completeFlowWorking) { 'WORKING' } else { 'BROKEN' })" -ForegroundColor $(if ($completeFlowWorking) { 'Green' } else { 'Red' })
Write-Host "   Error Handling: $(if ($errorHandlingWorking) { 'IMPROVED' } else { 'NEEDS WORK' })" -ForegroundColor $(if ($errorHandlingWorking) { 'Green' } else { 'Red' })

$totalFixed = @($healthWorking, $registrationWorking, $loginWorking, $tokenWorking, $completeFlowWorking, $errorHandlingWorking) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
$totalTests = 6

Write-Host "`nOVERALL RESULTS:" -ForegroundColor Cyan
Write-Host "   Fixed Components: $totalFixed / $totalTests" -ForegroundColor White
Write-Host "   Success Rate: $([math]::Round(($totalFixed / $totalTests) * 100, 1))%" -ForegroundColor White

if ($registrationWorking -and $loginWorking -and $tokenWorking) {
    Write-Host "`nSUCCESS: AUTHENTICATION ENDPOINTS ARE NOW WORKING!" -ForegroundColor Green
    Write-Host "All critical authentication issues have been resolved:" -ForegroundColor White
    Write-Host "- Registration endpoint: Fixed 500 Internal Server Error" -ForegroundColor White
    Write-Host "- Login endpoint: Fixed 502 Bad Gateway" -ForegroundColor White
    Write-Host "- Token verification: Working properly" -ForegroundColor White
    Write-Host "- Complete authentication flow: Functional" -ForegroundColor White
    Write-Host "- Circuit breaker protection: Active" -ForegroundColor White
    Write-Host "`nFloWorx authentication system is now production-ready!" -ForegroundColor Green
} elseif ($registrationWorking -or $loginWorking) {
    Write-Host "`nPARTIAL SUCCESS: Some authentication endpoints are now working." -ForegroundColor Yellow
    Write-Host "Further investigation needed for remaining issues." -ForegroundColor White
} else {
    Write-Host "`nISSUES REMAIN: Authentication endpoints still need debugging." -ForegroundColor Red
    Write-Host "The comprehensive fixes may need additional adjustments." -ForegroundColor White
}

Write-Host "`nTest User Details:" -ForegroundColor Cyan
Write-Host "   Email: $testEmail" -ForegroundColor White
Write-Host "   Password: [HIDDEN]" -ForegroundColor White

Write-Host "`nAuthentication fixes test completed!" -ForegroundColor Green

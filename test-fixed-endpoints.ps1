# Test Fixed Registration and Login Endpoints
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "fixed-endpoints-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "TESTING FIXED REGISTRATION AND LOGIN ENDPOINTS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Wait for deployment
Write-Host "`nWaiting for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# Step 1: Test Fixed Registration Endpoint
Write-Host "`n1. TESTING FIXED REGISTRATION ENDPOINT" -ForegroundColor Yellow
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
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

# Step 2: Test Fixed Login Endpoint
Write-Host "`n2. TESTING FIXED LOGIN ENDPOINT" -ForegroundColor Yellow
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

# Step 3: Test Token Verification
Write-Host "`n3. TESTING TOKEN VERIFICATION" -ForegroundColor Yellow
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

# Step 4: Test Complete Email Provider Flow
Write-Host "`n4. TESTING COMPLETE EMAIL PROVIDER FLOW" -ForegroundColor Yellow
if ($tokenWorking) {
    # Test onboarding status
    try {
        $onboardingStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
        Write-Host "SUCCESS: Onboarding status working" -ForegroundColor Green
        Write-Host "   Next Step: $($onboardingStatus.nextStep)" -ForegroundColor Gray
        
        # Test email provider selection
        $emailProviderData = @{
            provider = "gmail"
        } | ConvertTo-Json
        
        $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
        Write-Host "SUCCESS: Email provider selection working!" -ForegroundColor Green
        
        # Test business type selection
        $businessTypeData = @{
            businessTypeId = 6
        } | ConvertTo-Json
        
        $businessTypeResponse = Invoke-RestMethod -Uri "$baseUrl/api/business-types/select" -Method POST -Body $businessTypeData -Headers $headers
        Write-Host "SUCCESS: Business type selection working!" -ForegroundColor Green
        
        # Final status check
        $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
        Write-Host "SUCCESS: Complete flow working!" -ForegroundColor Green
        Write-Host "   Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
        Write-Host "   Business Type ID: $($finalStatus.businessTypeId)" -ForegroundColor Gray
        Write-Host "   Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
        
        $completeFlowWorking = $true
        
    } catch {
        Write-Host "FAILED: Complete flow has issues" -ForegroundColor Red
        $completeFlowWorking = $false
    }
} else {
    Write-Host "SKIPPED: No valid authentication" -ForegroundColor Yellow
    $completeFlowWorking = $false
}

# RESULTS SUMMARY
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "FINAL RESULTS SUMMARY" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`nENDPOINT STATUS:" -ForegroundColor Cyan
Write-Host "   Registration: $(if ($registrationWorking) { 'FIXED - WORKING' } else { 'STILL BROKEN' })" -ForegroundColor $(if ($registrationWorking) { 'Green' } else { 'Red' })
Write-Host "   Login: $(if ($loginWorking) { 'FIXED - WORKING' } else { 'STILL BROKEN' })" -ForegroundColor $(if ($loginWorking) { 'Green' } else { 'Red' })
Write-Host "   Token Verification: $(if ($tokenWorking) { 'WORKING' } else { 'BROKEN' })" -ForegroundColor $(if ($tokenWorking) { 'Green' } else { 'Red' })
Write-Host "   Complete Flow: $(if ($completeFlowWorking) { 'WORKING' } else { 'BROKEN' })" -ForegroundColor $(if ($completeFlowWorking) { 'Green' } else { 'Red' })

$totalFixed = @($registrationWorking, $loginWorking, $tokenWorking, $completeFlowWorking) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
$totalTests = 4

Write-Host "`nOVERALL STATUS:" -ForegroundColor Cyan
Write-Host "   Fixed Components: $totalFixed / $totalTests" -ForegroundColor White
Write-Host "   Success Rate: $([math]::Round(($totalFixed / $totalTests) * 100, 1))%" -ForegroundColor White

if ($registrationWorking -and $loginWorking -and $completeFlowWorking) {
    Write-Host "`nSUCCESS: ALL REMAINING ISSUES HAVE BEEN FIXED!" -ForegroundColor Green
    Write-Host "The FloWorx authentication and email provider system is now fully functional." -ForegroundColor White
} elseif ($registrationWorking -or $loginWorking) {
    Write-Host "`nPARTIAL SUCCESS: Some endpoints are now working." -ForegroundColor Yellow
} else {
    Write-Host "`nISSUES REMAIN: Further debugging needed." -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green

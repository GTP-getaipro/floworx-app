# Final Comprehensive Test - Complete Registration and Email Provider Flow
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "final-comprehensive-$(Get-Random)@example.com"
$testPassword = "TestPassword123!"

Write-Host "FINAL COMPREHENSIVE TEST - FloWorx Registration and Email Provider Flow" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Gray
Write-Host "Test Email: $testEmail" -ForegroundColor Cyan

# Wait for deployment
Write-Host "`nWaiting for deployment to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# Step 1: Test Fixed Original Registration Endpoint
Write-Host "`n1. ORIGINAL REGISTRATION ENDPOINT TEST" -ForegroundColor Yellow
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Sending registration data..."
try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "SUCCESS: Original registration endpoint now working!" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user.id)" -ForegroundColor Gray
    Write-Host "   Token received: YES" -ForegroundColor Gray
    $userId = $registerResponse.data.user.id
    $authToken = $registerResponse.data.token
    $registrationWorking = $true
} catch {
    Write-Host "FAILED: Original registration still has issues - Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $registrationWorking = $false
    
    # Fallback to test registration
    Write-Host "   Falling back to test registration endpoint..." -ForegroundColor Yellow
    try {
        $testRegisterResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/test-register" -Method POST -Body $registerData -ContentType "application/json"
        Write-Host "   Test registration: SUCCESS" -ForegroundColor Green
        $userId = $testRegisterResponse.data.user.id
        $authToken = $testRegisterResponse.data.token
    } catch {
        Write-Host "   Both registration endpoints failed - cannot continue" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Test Login
Write-Host "`n2. LOGIN ENDPOINT TEST" -ForegroundColor Yellow
$loginData = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    Write-Host "SUCCESS: Login endpoint working!" -ForegroundColor Green
    $loginWorking = $true
} catch {
    Write-Host "FAILED: Login endpoint still has issues - Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $loginWorking = $false
}

# Step 3: Authentication Test
Write-Host "`n3. AUTHENTICATION TEST" -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" -Method GET -Headers $headers
    Write-Host "SUCCESS: Token verification working!" -ForegroundColor Green
    $authWorking = $true
} catch {
    Write-Host "FAILED: Token verification failed" -ForegroundColor Red
    $authWorking = $false
}

# Step 4: Onboarding Status
Write-Host "`n4. ONBOARDING STATUS TEST" -ForegroundColor Yellow
try {
    $onboardingStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "SUCCESS: Onboarding status working!" -ForegroundColor Green
    Write-Host "   Next Step: $($onboardingStatus.nextStep)" -ForegroundColor Gray
    $onboardingWorking = $true
} catch {
    Write-Host "FAILED: Onboarding status failed" -ForegroundColor Red
    $onboardingWorking = $false
}

# Step 5: Email Provider Selection (CORE FEATURE)
Write-Host "`n5. EMAIL PROVIDER SELECTION TEST" -ForegroundColor Yellow
$emailProviderData = @{
    provider = "gmail"  # Using correct field name
} | ConvertTo-Json

try {
    $emailProviderResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailProviderData -Headers $headers
    Write-Host "SUCCESS: Email provider selection working!" -ForegroundColor Green
    Write-Host "   Selected Provider: gmail" -ForegroundColor Gray
    $emailProviderWorking = $true
} catch {
    Write-Host "FAILED: Email provider selection failed - Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $emailProviderWorking = $false
}

# Step 6: Business Type Selection
Write-Host "`n6. BUSINESS TYPE SELECTION TEST" -ForegroundColor Yellow
$businessTypeData = @{
    businessTypeId = 6
} | ConvertTo-Json

try {
    $businessTypeResponse = Invoke-RestMethod -Uri "$baseUrl/api/business-types/select" -Method POST -Body $businessTypeData -Headers $headers
    Write-Host "SUCCESS: Business type selection working!" -ForegroundColor Green
    $businessTypeWorking = $true
} catch {
    Write-Host "FAILED: Business type selection failed" -ForegroundColor Red
    $businessTypeWorking = $false
}

# Step 7: Final Status Verification
Write-Host "`n7. FINAL STATUS VERIFICATION" -ForegroundColor Yellow
try {
    $finalStatus = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "SUCCESS: Final status check working!" -ForegroundColor Green
    Write-Host "   Email Provider: $($finalStatus.emailProvider)" -ForegroundColor Gray
    Write-Host "   Business Type ID: $($finalStatus.businessTypeId)" -ForegroundColor Gray
    Write-Host "   Next Step: $($finalStatus.nextStep)" -ForegroundColor Gray
    
    $emailProviderSaved = $finalStatus.emailProvider -eq "gmail"
    $businessTypeSaved = $finalStatus.businessTypeId -eq 6
} catch {
    Write-Host "FAILED: Final status check failed" -ForegroundColor Red
    $emailProviderSaved = $false
    $businessTypeSaved = $false
}

# FINAL RESULTS SUMMARY
Write-Host "`n" + "=" * 80 -ForegroundColor Gray
Write-Host "FINAL TEST RESULTS SUMMARY" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Gray

Write-Host "`nCORE FUNCTIONALITY STATUS:" -ForegroundColor Cyan
Write-Host "   Registration (Original): $(if ($registrationWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($registrationWorking) { 'Green' } else { 'Red' })
Write-Host "   Login: $(if ($loginWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($loginWorking) { 'Green' } else { 'Red' })
Write-Host "   Authentication: $(if ($authWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($authWorking) { 'Green' } else { 'Red' })
Write-Host "   Onboarding Status: $(if ($onboardingWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($onboardingWorking) { 'Green' } else { 'Red' })
Write-Host "   Email Provider Selection: $(if ($emailProviderWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($emailProviderWorking) { 'Green' } else { 'Red' })
Write-Host "   Business Type Selection: $(if ($businessTypeWorking) { 'WORKING' } else { 'FAILED' })" -ForegroundColor $(if ($businessTypeWorking) { 'Green' } else { 'Red' })

Write-Host "`nDATA PERSISTENCE STATUS:" -ForegroundColor Cyan
Write-Host "   Email Provider Saved: $(if ($emailProviderSaved) { 'YES' } else { 'NO' })" -ForegroundColor $(if ($emailProviderSaved) { 'Green' } else { 'Red' })
Write-Host "   Business Type Saved: $(if ($businessTypeSaved) { 'YES' } else { 'NO' })" -ForegroundColor $(if ($businessTypeSaved) { 'Green' } else { 'Red' })

# Calculate overall success
$totalTests = 6
$passedTests = @($registrationWorking, $loginWorking, $authWorking, $onboardingWorking, $emailProviderWorking, $businessTypeWorking) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
$successRate = [math]::Round(($passedTests / $totalTests) * 100, 1)

Write-Host "`nOVERALL RESULTS:" -ForegroundColor Cyan
Write-Host "   Tests Passed: $passedTests / $totalTests" -ForegroundColor White
Write-Host "   Success Rate: $successRate%" -ForegroundColor White

if ($emailProviderWorking -and $emailProviderSaved) {
    Write-Host "`nSUCCESS: EMAIL PROVIDER IMPLEMENTATION IS FULLY FUNCTIONAL!" -ForegroundColor Green
    Write-Host "The core email provider selection feature is working perfectly in production." -ForegroundColor White
} elseif ($emailProviderWorking) {
    Write-Host "`nPARTIAL SUCCESS: Email provider selection works but data persistence needs verification." -ForegroundColor Yellow
} else {
    Write-Host "`nISSUE: Email provider selection needs further debugging." -ForegroundColor Red
}

Write-Host "`nTest User Details:" -ForegroundColor Cyan
Write-Host "   Email: $testEmail" -ForegroundColor White
Write-Host "   User ID: $userId" -ForegroundColor White

Write-Host "`nTest completed!" -ForegroundColor Green

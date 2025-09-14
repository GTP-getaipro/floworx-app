# Final Simple Test
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "final-simple-$(Get-Random)@example.com"

Write-Host "FINAL TEST - Email Provider Implementation" -ForegroundColor Green

# Wait for deployment
Write-Host "Waiting for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# Test 1: Original Registration
Write-Host "`nTesting original registration endpoint..." -ForegroundColor Yellow
$data = @{
    email = $testEmail
    password = "Test123!"
    firstName = "Test"
    lastName = "User"
    agreeToTerms = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $data -ContentType "application/json"
    Write-Host "SUCCESS: Original registration now working!" -ForegroundColor Green
    $token = $response.data.token
} catch {
    Write-Host "FAILED: Original registration still has issues" -ForegroundColor Red
    
    # Try test endpoint
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/test-register" -Method POST -Body $data -ContentType "application/json"
        Write-Host "SUCCESS: Test registration working" -ForegroundColor Green
        $token = $response.data.token
    } catch {
        Write-Host "FAILED: Both registration endpoints failed" -ForegroundColor Red
        exit 1
    }
}

# Test 2: Email Provider Selection
Write-Host "`nTesting email provider selection..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$emailData = @{
    emailProvider = "gmail"
} | ConvertTo-Json

try {
    $emailResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailData -Headers $headers
    Write-Host "SUCCESS: Email provider selection working!" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Email provider selection failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 3: Final Status
Write-Host "`nChecking final status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "Email Provider: $($status.emailProvider)" -ForegroundColor Gray
    Write-Host "Next Step: $($status.nextStep)" -ForegroundColor Gray
    
    if ($status.emailProvider -eq "gmail") {
        Write-Host "`nSUCCESS: EMAIL PROVIDER IMPLEMENTATION WORKING!" -ForegroundColor Green
    } else {
        Write-Host "`nPartial success - email provider not saved" -ForegroundColor Yellow
    }
} catch {
    Write-Host "FAILED: Status check failed" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green

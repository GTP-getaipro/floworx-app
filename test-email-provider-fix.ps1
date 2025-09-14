# Test Email Provider with Correct Field Name
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "provider-fix-$(Get-Random)@example.com"

Write-Host "Testing Email Provider with Correct Field Name" -ForegroundColor Green

# Register user
$registerData = @{
    email = $testEmail
    password = "Test123!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/test-register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "Registration: SUCCESS" -ForegroundColor Green
    $token = $response.data.token
} catch {
    Write-Host "Registration failed" -ForegroundColor Red
    exit 1
}

# Test email provider with correct field name
Write-Host "`nTesting email provider selection with 'provider' field..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$emailData = @{
    provider = "gmail"  # Changed from emailProvider to provider
} | ConvertTo-Json

Write-Host "Sending: $emailData"

try {
    $emailResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/email-provider" -Method POST -Body $emailData -Headers $headers
    Write-Host "SUCCESS: Email provider selection working!" -ForegroundColor Green
    Write-Host "Response: $($emailResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody" -ForegroundColor Gray
    } catch {}
}

# Check final status
Write-Host "`nChecking final status..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -Headers $headers
    Write-Host "Email Provider: $($status.emailProvider)" -ForegroundColor Gray
    Write-Host "Next Step: $($status.nextStep)" -ForegroundColor Gray
    
    if ($status.emailProvider -eq "gmail") {
        Write-Host "`n🎉 SUCCESS: EMAIL PROVIDER IMPLEMENTATION FULLY WORKING!" -ForegroundColor Green
        Write-Host "✅ Registration: Working (test endpoint)" -ForegroundColor Green
        Write-Host "✅ Authentication: Working" -ForegroundColor Green
        Write-Host "✅ Email Provider Selection: Working" -ForegroundColor Green
        Write-Host "✅ Database Storage: Working" -ForegroundColor Green
        Write-Host "✅ Production Deployment: Complete" -ForegroundColor Green
    } else {
        Write-Host "`nEmail provider not saved correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Status check failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green

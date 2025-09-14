# Test Original Registration Endpoint with Debug
$baseUrl = "https://app.floworx-iq.com"
$testEmail = "debug-original-$(Get-Random)@example.com"

Write-Host "Testing Original Registration Endpoint with Debug Logging" -ForegroundColor Green

# Wait for deployment
Write-Host "Waiting for deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# Test original registration endpoint
Write-Host "`nTesting original registration endpoint..." -ForegroundColor Yellow
$data = @{
    email = $testEmail
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Sending data: $data"

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $data -ContentType "application/json"
    Write-Host "SUCCESS: Original registration now working!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error details" -ForegroundColor Gray
    }
}

Write-Host "`nTest complete - check server logs for debug output" -ForegroundColor Green

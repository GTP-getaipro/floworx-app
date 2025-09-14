# Simple Registration Test
$baseUrl = "https://app.floworx-iq.com"

Write-Host "Testing Registration Endpoint" -ForegroundColor Green

# Test 1: Minimal data (without phone)
Write-Host "`nTest 1: Minimal data (no phone)" -ForegroundColor Yellow
$data1 = @{
    email = "test1-$(Get-Random)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Sending: $data1"
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $data1 -ContentType "application/json"
    Write-Host "SUCCESS: Registration worked without phone" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error" -ForegroundColor Gray
    }
}

# Test 2: With phone field
Write-Host "`nTest 2: With phone field" -ForegroundColor Yellow
$data2 = @{
    email = "test2-$(Get-Random)@example.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    agreeToTerms = $true
} | ConvertTo-Json

Write-Host "Sending: $data2"
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $data2 -ContentType "application/json"
    Write-Host "SUCCESS: Registration worked with phone" -ForegroundColor Green
    Write-Host "Response: $($response2 | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: Status $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody" -ForegroundColor Gray
    } catch {
        Write-Host "Could not read error" -ForegroundColor Gray
    }
}

# Test 3: Check if it's a validation issue by testing business types endpoint
Write-Host "`nTest 3: Checking if API is working" -ForegroundColor Yellow
try {
    $businessTypes = Invoke-RestMethod -Uri "$baseUrl/api/business-types" -Method GET
    Write-Host "SUCCESS: Business types endpoint works ($($businessTypes.data.Count) types)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Business types endpoint also failing" -ForegroundColor Red
}

# Test 4: Check health endpoint
Write-Host "`nTest 4: Health check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "SUCCESS: Health endpoint works ($($health.status))" -ForegroundColor Green
} catch {
    Write-Host "FAILED: Health endpoint failing" -ForegroundColor Red
}

Write-Host "`nTest Complete" -ForegroundColor Green

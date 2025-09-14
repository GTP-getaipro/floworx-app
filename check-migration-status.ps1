# Check if the database migration was applied
$baseUrl = "https://app.floworx-iq.com"

Write-Host "🔍 Checking Migration Status" -ForegroundColor Yellow

# Test if we can access a simple endpoint that doesn't require the new schema
Write-Host "`n1️⃣ Testing Basic API..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ API responding: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API not responding" -ForegroundColor Red
    exit 1
}

# Test business types (should work regardless of migration)
Write-Host "`n2️⃣ Testing Business Types..." -ForegroundColor Cyan
try {
    $businessTypes = Invoke-RestMethod -Uri "$baseUrl/api/business-types" -Method GET
    Write-Host "✅ Business Types working: $($businessTypes.data.Count) types" -ForegroundColor Green
} catch {
    Write-Host "❌ Business Types failed" -ForegroundColor Red
}

# Test onboarding status without auth (should return 401 or 500)
Write-Host "`n3️⃣ Testing Onboarding Endpoint..." -ForegroundColor Cyan
try {
    $status = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET
    Write-Host "⚠️ Onboarding accessible without auth" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ Onboarding returns 401 (auth required) - Schema likely OK" -ForegroundColor Green
    } elseif ($statusCode -eq 500) {
        Write-Host "❌ Onboarding returns 500 - Migration needed" -ForegroundColor Red
        Write-Host "   This indicates the database schema is missing" -ForegroundColor Red
    } else {
        Write-Host "⚠️ Onboarding returns: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Migration Status Check Complete" -ForegroundColor Green
Write-Host "If you see 500 errors, please apply the fixed migration SQL in Supabase Dashboard" -ForegroundColor Yellow

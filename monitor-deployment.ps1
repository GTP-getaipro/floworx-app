# Monitor deployment status and test when ready
$baseUrl = "https://app.floworx-iq.com"
$maxWaitMinutes = 10
$checkIntervalSeconds = 30

Write-Host "🚀 Monitoring Deployment Status" -ForegroundColor Green
Write-Host "Waiting for new deployment to complete..." -ForegroundColor Yellow
Write-Host "This typically takes 3-5 minutes" -ForegroundColor Gray

$startTime = Get-Date
$deploymentReady = $false

while (-not $deploymentReady -and ((Get-Date) - $startTime).TotalMinutes -lt $maxWaitMinutes) {
    try {
        Write-Host "`n⏳ Checking deployment status..." -ForegroundColor Cyan
        
        # Check if API is responding
        $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 10
        $currentTime = Get-Date -Format "HH:mm:ss"
        
        Write-Host "[$currentTime] API Status: $($health.status)" -ForegroundColor Green
        Write-Host "[$currentTime] Build Time: $($health.deployment.buildTime)" -ForegroundColor Gray
        
        # Check if the new debug log is present by testing onboarding endpoint
        try {
            $testResponse = Invoke-RestMethod -Uri "$baseUrl/api/onboarding/status" -Method GET -TimeoutSec 5
            Write-Host "[$currentTime] ✅ Onboarding endpoint responding (no auth)" -ForegroundColor Green
            $deploymentReady = $true
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 401) {
                Write-Host "[$currentTime] ✅ Onboarding endpoint ready (401 - auth required)" -ForegroundColor Green
                $deploymentReady = $true
            } elseif ($statusCode -eq 500) {
                Write-Host "[$currentTime] ⚠️ Still getting 500 errors - deployment may not be ready" -ForegroundColor Yellow
            } else {
                Write-Host "[$currentTime] ⚠️ Onboarding endpoint returns: $statusCode" -ForegroundColor Yellow
            }
        }
        
        if (-not $deploymentReady) {
            Write-Host "[$currentTime] Waiting $checkIntervalSeconds seconds before next check..." -ForegroundColor Gray
            Start-Sleep -Seconds $checkIntervalSeconds
        }
        
    } catch {
        Write-Host "[$currentTime] ❌ API not responding yet: $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep -Seconds $checkIntervalSeconds
    }
}

if ($deploymentReady) {
    Write-Host "`n🎉 Deployment appears to be ready!" -ForegroundColor Green
    Write-Host "Running production test..." -ForegroundColor Yellow
    
    # Run the production test
    & powershell -ExecutionPolicy Bypass -File test-production-deployment.ps1
} else {
    Write-Host "`n⏰ Timeout reached. Deployment may still be in progress." -ForegroundColor Yellow
    Write-Host "You can manually test with: powershell -ExecutionPolicy Bypass -File test-production-deployment.ps1" -ForegroundColor Gray
}

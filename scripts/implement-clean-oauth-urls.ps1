# FloWorx Clean OAuth URLs Implementation Script (PowerShell)
# This script implements the clean Vercel domain OAuth configuration

Write-Host "🚀 Implementing Clean OAuth URLs for FloWorx..." -ForegroundColor Green
Write-Host "=============================================="

# Check if vercel CLI is installed
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel"
    exit 1
}

Write-Host ""
Write-Host "📋 Current Configuration Check:" -ForegroundColor Yellow
Write-Host "==============================="

# Show current environment variables
Write-Host "🔍 Checking current environment variables..."
vercel env ls

Write-Host ""
Write-Host "🎯 OAuth URL Options:" -ForegroundColor Yellow
Write-Host "===================="
Write-Host ""
Write-Host "Option A (Recommended for immediate fix):" -ForegroundColor Cyan
Write-Host "  Clean Vercel Domain: https://floworx-app.vercel.app"
Write-Host "  OAuth Redirect: https://floworx-app.vercel.app/api/oauth/google/callback"
Write-Host "  ✅ Quick to implement (10 minutes)"
Write-Host "  ✅ Professional appearance"
Write-Host "  ✅ Stable and reliable"
Write-Host ""
Write-Host "Option B (Best for long-term):" -ForegroundColor Magenta
Write-Host "  Custom Domain: https://app.floworx-iq.com"
Write-Host "  OAuth Redirect: https://app.floworx-iq.com/api/oauth/google/callback"
Write-Host "  ✅ Fully branded"
Write-Host "  ✅ Most professional"
Write-Host "  ⚠️  Requires DNS setup (30 minutes)"

Write-Host ""
$choice = Read-Host "Which option do you want to implement? (A/B)"

if ($choice -eq "A" -or $choice -eq "a") {
    Write-Host ""
    Write-Host "🚀 OPTION A: Clean Vercel Domain Implementation" -ForegroundColor Green
    Write-Host "=============================================="
    
    Write-Host ""
    Write-Host "⚡ Updating Vercel environment variables..." -ForegroundColor Yellow
    
    # Update GOOGLE_REDIRECT_URI
    Write-Host "📝 Setting GOOGLE_REDIRECT_URI..."
    $redirectUri = "https://floworx-app.vercel.app/api/oauth/google/callback"
    Write-Host "Setting to: $redirectUri"
    
    # Update FRONTEND_URL
    Write-Host "📝 Setting FRONTEND_URL..."
    $frontendUrl = "https://floworx-app.vercel.app"
    Write-Host "Setting to: $frontendUrl"
    
    Write-Host ""
    Write-Host "🚀 Ready to deploy with new configuration..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to run these commands manually:" -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Update GOOGLE_REDIRECT_URI:" -ForegroundColor Cyan
    Write-Host "   vercel env add GOOGLE_REDIRECT_URI production"
    Write-Host "   # When prompted, enter: $redirectUri"
    Write-Host ""
    Write-Host "2. Update FRONTEND_URL:" -ForegroundColor Cyan
    Write-Host "   vercel env add FRONTEND_URL production"
    Write-Host "   # When prompted, enter: $frontendUrl"
    Write-Host ""
    Write-Host "3. Deploy:" -ForegroundColor Cyan
    Write-Host "   vercel --prod"
    
    Write-Host ""
    Write-Host "📋 After running the commands above:" -ForegroundColor Yellow
    Write-Host "1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials"
    Write-Host "2. Update OAuth redirect URI to: $redirectUri"
    Write-Host "3. Save changes in Google Cloud Console"
    Write-Host "4. Test OAuth flow at: $frontendUrl"
    
} elseif ($choice -eq "B" -or $choice -eq "b") {
    Write-Host ""
    Write-Host "⭐ OPTION B: Custom Domain Setup" -ForegroundColor Magenta
    Write-Host "==============================="
    
    $customDomain = "app.floworx-iq.com"
    $customRedirectUri = "https://$customDomain/api/oauth/google/callback"
    
    Write-Host ""
    Write-Host "🌐 Custom Domain Implementation Steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1️⃣ Add custom domain to Vercel:" -ForegroundColor Cyan
    Write-Host "   vercel domains add $customDomain"
    Write-Host ""
    Write-Host "2️⃣ Configure DNS at your domain provider:" -ForegroundColor Cyan
    Write-Host "   Type: CNAME"
    Write-Host "   Name: app"
    Write-Host "   Value: cname.vercel-dns.com"
    Write-Host "   TTL: 300"
    Write-Host ""
    Write-Host "3️⃣ Update environment variables:" -ForegroundColor Cyan
    Write-Host "   vercel env add GOOGLE_REDIRECT_URI production"
    Write-Host "   # Enter: $customRedirectUri"
    Write-Host ""
    Write-Host "   vercel env add FRONTEND_URL production"
    Write-Host "   # Enter: https://$customDomain"
    Write-Host ""
    Write-Host "4️⃣ Deploy:" -ForegroundColor Cyan
    Write-Host "   vercel --prod"
    Write-Host ""
    Write-Host "5️⃣ Update Google Cloud Console:" -ForegroundColor Cyan
    Write-Host "   - Go to: https://console.cloud.google.com/apis/credentials"
    Write-Host "   - Update redirect URI to: $customRedirectUri"
    Write-Host "   - Save changes"
    
    Write-Host ""
    $addDomain = Read-Host "Do you want to add the custom domain now? (y/n)"
    
    if ($addDomain -eq "y" -or $addDomain -eq "Y") {
        Write-Host ""
        Write-Host "🌐 Adding custom domain..." -ForegroundColor Yellow
        vercel domains add $customDomain
        
        Write-Host ""
        Write-Host "✅ Custom domain command executed!" -ForegroundColor Green
        Write-Host "   Please configure DNS and then continue with steps 3-5 above."
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Invalid choice. Please run the script again and choose A or B." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🧪 Validation Commands:" -ForegroundColor Yellow
Write-Host "======================"
Write-Host ""
Write-Host "After completing all steps, validate with:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# Check environment variables"
Write-Host "vercel env ls"
Write-Host ""
Write-Host "# Test OAuth endpoint (replace URL with your chosen option)"
Write-Host "curl -I https://floworx-app.vercel.app/api/oauth/google"
Write-Host "# OR for custom domain:"
Write-Host "curl -I https://app.floworx-iq.com/api/oauth/google"
Write-Host ""
Write-Host "# Manual test steps:"
Write-Host "# 1. Go to your production URL"
Write-Host "# 2. Register/login to dashboard"
Write-Host "# 3. Click 'Connect Your Google Account'"
Write-Host "# 4. Should redirect to Google OAuth (no 'Access token required' error)"

Write-Host ""
Write-Host "🎉 OAuth URL implementation guide complete!" -ForegroundColor Green
Write-Host "   Follow the manual steps above to complete the setup."

Write-Host ""
Write-Host "📞 Need help? Check the troubleshooting guide:" -ForegroundColor Yellow
Write-Host "   - Clear browser cache if OAuth still fails"
Write-Host "   - Verify Google Cloud Console URLs match exactly"
Write-Host "   - Wait 5-10 minutes for DNS propagation (custom domain)"
Write-Host "   - Check Vercel logs: vercel logs --prod"

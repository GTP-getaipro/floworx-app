#!/bin/bash

# FloWorx Clean OAuth URLs Implementation Script
# This script implements the clean Vercel domain OAuth configuration

echo "🚀 Implementing Clean OAuth URLs for FloWorx..."
echo "=============================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

echo ""
echo "📋 Current Configuration Check:"
echo "==============================="

# Show current environment variables
echo "🔍 Checking current environment variables..."
vercel env ls

echo ""
echo "🎯 Implementing Clean OAuth URLs:"
echo "================================="

# Option A: Clean Vercel Domain (Immediate Fix)
echo ""
echo "🚀 OPTION A: Clean Vercel Domain (Quick Fix)"
echo "============================================"
echo ""
echo "This will update your OAuth configuration to use:"
echo "  Frontend URL: https://floworx-app.vercel.app"
echo "  OAuth Redirect: https://floworx-app.vercel.app/api/oauth/google/callback"
echo ""

read -p "Do you want to proceed with Option A (Clean Vercel Domain)? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚡ Updating Vercel environment variables..."
    
    # Update GOOGLE_REDIRECT_URI
    echo "📝 Setting GOOGLE_REDIRECT_URI..."
    echo "https://floworx-app.vercel.app/api/oauth/google/callback" | vercel env add GOOGLE_REDIRECT_URI production
    
    # Update FRONTEND_URL
    echo "📝 Setting FRONTEND_URL..."
    echo "https://floworx-app.vercel.app" | vercel env add FRONTEND_URL production
    
    echo ""
    echo "🚀 Deploying with new configuration..."
    vercel --prod
    
    echo ""
    echo "✅ Clean Vercel Domain configuration complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials"
    echo "2. Update OAuth redirect URI to: https://floworx-app.vercel.app/api/oauth/google/callback"
    echo "3. Save changes in Google Cloud Console"
    echo "4. Test OAuth flow at: https://floworx-app.vercel.app"
    
else
    echo ""
    echo "⭐ OPTION B: Custom Domain Setup"
    echo "================================"
    echo ""
    echo "For custom domain setup (https://app.floworx-iq.com), follow these steps:"
    echo ""
    echo "1️⃣ Add custom domain to Vercel:"
    echo "   vercel domains add app.floworx-iq.com"
    echo ""
    echo "2️⃣ Configure DNS at your domain provider:"
    echo "   Type: CNAME"
    echo "   Name: app"
    echo "   Value: cname.vercel-dns.com"
    echo "   TTL: 300"
    echo ""
    echo "3️⃣ Update environment variables:"
    echo "   vercel env add GOOGLE_REDIRECT_URI production"
    echo "   # Enter: https://app.floworx-iq.com/api/oauth/google/callback"
    echo ""
    echo "   vercel env add FRONTEND_URL production"
    echo "   # Enter: https://app.floworx-iq.com"
    echo ""
    echo "4️⃣ Deploy:"
    echo "   vercel --prod"
    echo ""
    echo "5️⃣ Update Google Cloud Console with custom domain URL"
    
    read -p "Do you want to add the custom domain now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🌐 Adding custom domain..."
        vercel domains add app.floworx-iq.com
        
        echo ""
        echo "✅ Custom domain added! Please configure DNS and then run:"
        echo "   ./scripts/implement-clean-oauth-urls.sh"
        echo "   And choose to update environment variables."
    fi
fi

echo ""
echo "🧪 Validation Commands:"
echo "======================"
echo ""
echo "After updating Google Cloud Console, test with:"
echo ""
echo "# Check environment variables"
echo "vercel env ls"
echo ""
echo "# Test OAuth endpoint"
echo "curl -I https://floworx-app.vercel.app/api/oauth/google"
echo ""
echo "# Manual test"
echo "# 1. Go to https://floworx-app.vercel.app"
echo "# 2. Register/login"
echo "# 3. Click 'Connect Your Google Account'"
echo "# 4. Should redirect to Google (no 'Access token required' error)"
echo ""
echo "🎉 OAuth URL implementation complete!"
echo "   Don't forget to update Google Cloud Console!"

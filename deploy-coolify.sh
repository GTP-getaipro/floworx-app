#!/bin/bash

# Coolify Deployment Script for FloWorx
echo "🚀 Starting FloWorx deployment to Coolify..."

# Build the application
echo "📦 Building application..."
docker build -t floworx-app:latest .

# Test the build locally (optional)
echo "🧪 Testing build..."
docker run --rm -p 5001:5001 --env-file .env.production floworx-app:latest &
CONTAINER_PID=$!

# Wait for container to start
sleep 10

# Test health endpoint
if curl -f http://localhost:5001/api/health; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $CONTAINER_PID
    exit 1
fi

# Stop test container
kill $CONTAINER_PID

echo "✅ Build validation complete"
echo "🎯 Ready for Coolify deployment!"

echo ""
echo "📋 NEXT STEPS:"
echo "=============="
echo "1. Push code to your Git repository"
echo "2. In Coolify dashboard:"
echo "   - Create new application"
echo "   - Connect to your Git repository"
echo "   - Set domain: app.floworx-iq.com"
echo "   - Configure environment variables from .env.production"
echo "   - Deploy!"
echo ""
echo "🔧 ENVIRONMENT VARIABLES TO SET IN COOLIFY:"
echo "==========================================="

# Read and display environment variables
if [ -f ".env.production" ]; then
    grep -v '^#' .env.production | grep -v '^$' | while read line; do
        echo "   $line"
    done
fi

echo ""
echo "🌐 IMPORTANT URLS TO UPDATE:"
echo "============================"
echo "• Google OAuth Console: Add https://app.floworx-iq.com/api/oauth/google/callback"
echo "• SendGrid Domain Authentication: Verify app.floworx-iq.com"
echo "• n8n Webhooks: Update to use https://app.floworx-iq.com/api/webhooks"
#!/bin/bash

# FloWorx Docker Deployment Script
# This script builds and deploys using pure Docker (no Nixpacks)

echo "🚀 Starting FloWorx Docker deployment..."

# Set environment variables to prevent browser downloads
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
export NODE_ENV=production

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t floworx-app:latest -f Dockerfile .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
    
    # Stop existing container if running
    echo "🛑 Stopping existing container..."
    docker stop floworx-app 2>/dev/null || true
    docker rm floworx-app 2>/dev/null || true
    
    # Run the new container
    echo "🏃 Starting new container..."
    docker run -d \
        --name floworx-app \
        -p 5001:5001 \
        --env-file .env \
        floworx-app:latest
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "🌐 Application should be available at http://localhost:5001"
        
        # Show container status
        echo "📊 Container status:"
        docker ps | grep floworx-app
        
        # Show logs
        echo "📝 Recent logs:"
        docker logs floworx-app --tail 20
    else
        echo "❌ Failed to start container"
        exit 1
    fi
else
    echo "❌ Docker build failed"
    exit 1
fi

#!/bin/bash

# FloWorx Production 503 Error Fix Script
# This script diagnoses and fixes common 503 service unavailable errors

echo "🔧 FloWorx Production 503 Error Fix Script"
echo "=========================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service status
check_service_status() {
    echo "🔍 Checking service status..."
    
    if command_exists docker; then
        echo "📦 Docker containers:"
        docker ps -a | grep -E "(floworx|app)" || echo "No FloWorx containers found"
        echo ""
    fi
    
    if command_exists systemctl; then
        echo "🔧 System services:"
        systemctl status floworx* 2>/dev/null || echo "No FloWorx systemd services found"
        echo ""
    fi
    
    echo "🌐 Port 5001 status:"
    netstat -tlnp | grep :5001 || echo "Port 5001 not in use"
    echo ""
}

# Function to check environment variables
check_environment() {
    echo "🔍 Checking environment configuration..."
    
    if [ -f ".env" ]; then
        echo "✅ .env file found"
        
        # Check critical variables
        if grep -q "SUPABASE_URL" .env; then
            echo "✅ SUPABASE_URL configured"
        else
            echo "❌ SUPABASE_URL missing"
        fi
        
        if grep -q "JWT_SECRET" .env; then
            echo "✅ JWT_SECRET configured"
        else
            echo "❌ JWT_SECRET missing"
        fi
        
        if grep -q "SENDGRID_API_KEY" .env; then
            echo "✅ SENDGRID_API_KEY configured"
        else
            echo "❌ SENDGRID_API_KEY missing"
        fi
    else
        echo "❌ .env file not found"
    fi
    echo ""
}

# Function to check logs
check_logs() {
    echo "🔍 Checking recent logs..."
    
    if command_exists docker; then
        echo "📦 Docker logs:"
        docker logs floworx-app --tail 20 2>/dev/null || echo "No FloWorx container logs found"
        echo ""
    fi
    
    if [ -f "/var/log/floworx.log" ]; then
        echo "📝 Application logs:"
        tail -20 /var/log/floworx.log
        echo ""
    fi
    
    if command_exists journalctl; then
        echo "📋 System logs:"
        journalctl -u floworx* --lines 10 --no-pager 2>/dev/null || echo "No FloWorx systemd logs found"
        echo ""
    fi
}

# Function to restart services
restart_services() {
    echo "🔄 Attempting to restart services..."
    
    if command_exists docker; then
        echo "📦 Restarting Docker containers..."
        
        # Stop existing containers
        docker stop floworx-app 2>/dev/null || true
        docker rm floworx-app 2>/dev/null || true
        
        # Check if we have a docker-compose file
        if [ -f "docker-compose.yml" ]; then
            echo "🐳 Using docker-compose..."
            docker-compose down
            docker-compose up -d
        elif [ -f "Dockerfile" ]; then
            echo "🐳 Building and running from Dockerfile..."
            docker build -t floworx-app:latest .
            docker run -d \
                --name floworx-app \
                -p 5001:5001 \
                --env-file .env \
                --restart unless-stopped \
                floworx-app:latest
        else
            echo "❌ No Docker configuration found"
        fi
    fi
    
    if command_exists systemctl; then
        echo "🔧 Restarting systemd services..."
        systemctl restart floworx* 2>/dev/null || echo "No FloWorx systemd services found"
    fi
    
    echo ""
}

# Function to test connectivity
test_connectivity() {
    echo "🧪 Testing connectivity..."
    
    # Wait for service to start
    echo "⏳ Waiting 30 seconds for service to start..."
    sleep 30
    
    # Test local connectivity
    if command_exists curl; then
        echo "🌐 Testing local connectivity:"
        curl -f http://localhost:5001/api/health 2>/dev/null && echo "✅ Local health check passed" || echo "❌ Local health check failed"
        
        echo "🌐 Testing production domain:"
        curl -f https://app.floworx-iq.com/api/health 2>/dev/null && echo "✅ Production health check passed" || echo "❌ Production health check failed"
    else
        echo "❌ curl not available for testing"
    fi
    
    echo ""
}

# Function to show next steps
show_next_steps() {
    echo "📋 Next Steps:"
    echo "=============="
    echo "1. Check if the service is now running:"
    echo "   curl https://app.floworx-iq.com/api/health"
    echo ""
    echo "2. If still not working, check your hosting provider:"
    echo "   - Coolify dashboard"
    echo "   - Server resource usage"
    echo "   - Domain DNS settings"
    echo ""
    echo "3. Manual restart commands:"
    echo "   docker-compose down && docker-compose up -d"
    echo "   systemctl restart floworx"
    echo ""
    echo "4. Check logs for errors:"
    echo "   docker logs floworx-app"
    echo "   journalctl -u floworx -f"
    echo ""
}

# Main execution
main() {
    echo "🚀 Starting diagnosis and fix process..."
    echo ""
    
    check_service_status
    check_environment
    check_logs
    restart_services
    test_connectivity
    show_next_steps
    
    echo "🎯 Fix script completed!"
    echo "If the service is still not working, please check your hosting provider's dashboard."
}

# Run the main function
main

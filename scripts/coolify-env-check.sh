#!/bin/bash

# Coolify Environment Variables Checker
# Run this script in your Coolify deployment container

echo "🔍 Coolify Environment Check"
echo "============================"

echo ""
echo "📋 Critical Environment Variables:"
echo "-----------------------------------"

# Check each required environment variable
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -n "$var_value" ]; then
        if [[ $var_name == *"PASSWORD"* ]] || [[ $var_name == *"SECRET"* ]] || [[ $var_name == *"KEY"* ]]; then
            echo "✅ $var_name: [SET - ${#var_value} characters]"
        else
            echo "✅ $var_name: $var_value"
        fi
    else
        echo "❌ $var_name: NOT SET"
    fi
}

# List of required environment variables
env_vars=(
    "NODE_ENV"
    "DATABASE_URL"
    "REDIS_HOST"
    "REDIS_PORT"
    "REDIS_PASSWORD"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "JWT_SECRET"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "FRONTEND_URL"
    "CORS_ORIGIN"
)

for var in "${env_vars[@]}"; do
    check_env_var "$var"
done

echo ""
echo "🗄️  Database Connectivity Test:"
echo "-------------------------------"

if [ -n "$DATABASE_URL" ]; then
    echo "Testing database connection..."
    # Extract database details from URL
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.*) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"

        echo "📍 Database: $DB_HOST:$DB_PORT/$DB_NAME"

        # Test connection (requires pg_isready or similar tool)
        if command -v pg_isready &> /dev/null; then
            if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
                echo "✅ Database connection successful"
            else
                echo "❌ Database connection failed"
            fi
        else
            echo "⚠️  pg_isready not available, skipping connection test"
        fi
    else
        echo "❌ Invalid DATABASE_URL format"
    fi
else
    echo "❌ DATABASE_URL not set"
fi

echo ""
echo "🔴 Redis/KeyDB Connectivity Test:"
echo "----------------------------------"

if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    echo "Testing Redis connection to $REDIS_HOST:$REDIS_PORT..."

    # Test Redis connection
    if command -v redis-cli &> /dev/null; then
        if [ -n "$REDIS_PASSWORD" ]; then
            if timeout 5 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping &> /dev/null; then
                echo "✅ Redis connection successful"
            else
                echo "❌ Redis connection failed"
            fi
        else
            if timeout 5 redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
                echo "✅ Redis connection successful"
            else
                echo "❌ Redis connection failed"
            fi
        fi
    else
        echo "⚠️  redis-cli not available, skipping connection test"
        # Fallback: try netcat or telnet
        if command -v nc &> /dev/null; then
            if nc -z -w5 "$REDIS_HOST" "$REDIS_PORT" &> /dev/null; then
                echo "✅ Redis port is open"
            else
                echo "❌ Redis port is closed"
            fi
        fi
    fi
else
    echo "❌ REDIS_HOST or REDIS_PORT not set"
fi

echo ""
echo "🌐 Network Connectivity Test:"
echo "------------------------------"

# Test basic network connectivity
echo "Testing DNS resolution..."
if nslookup google.com &> /dev/null; then
    echo "✅ DNS resolution working"
else
    echo "❌ DNS resolution failed"
fi

echo ""
echo "📊 System Information:"
echo "----------------------"
echo "🖥️  Hostname: $(hostname)"
echo "👤 User: $(whoami)"
echo "📁 Working Directory: $(pwd)"
echo "🐧 OS: $(uname -a)"
echo "💾 Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "💽 Disk: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"

echo ""
echo "🔧 Troubleshooting Commands:"
echo "============================="
echo "# Check running processes:"
echo "ps aux | grep -E '(node|redis|postgres)'"
echo ""
echo "# Check network connections:"
echo "netstat -tlnp | grep -E ':(5432|6379|5001)'"
echo ""
echo "# Check application logs:"
echo "tail -f /app/logs/*.log"
echo ""
echo "# Test Redis manually:"
echo "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping"
echo ""
echo "# Test database manually:"
echo "psql '$DATABASE_URL' -c 'SELECT 1;'"

echo ""
echo "✨ Environment check complete!"

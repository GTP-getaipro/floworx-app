# 🚨 Coolify Deployment Troubleshooting Guide

This guide helps you diagnose and fix common issues with your Coolify deployment.

## 📋 Quick Diagnosis

### 1. Environment Variables Check
Run this command in your Coolify deployment container:

```bash
# Download and run the environment checker
curl -s https://raw.githubusercontent.com/GTP-getaipro/floworx-app/main/scripts/coolify-env-check.sh | bash
```

Or manually check key variables:
```bash
echo "REDIS_HOST: $REDIS_HOST"
echo "REDIS_PORT: $REDIS_PORT"
echo "DATABASE_URL: $DATABASE_URL"
echo "SUPABASE_URL: $SUPABASE_URL"
```

### 2. Service Connectivity Tests

#### Database Connection Test:
```bash
# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT version();"
```

#### Redis/KeyDB Connection Test:
```bash
# Test Redis connection
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping

# If password is set:
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping
```

## 🔧 Common Issues & Solutions

### Issue 1: KeyDB/Redis Connection Failures
**Symptoms:** Logs show "KeyDB connection failed" with timeouts

**Solutions:**
1. **Check Service Name:**
   ```bash
   # In Coolify dashboard, verify the exact service name
   # Update REDIS_HOST to match the actual service name
   REDIS_HOST=keydb-service  # or whatever the actual name is
   ```

2. **Verify Service is Running:**
   ```bash
   # Check if Redis service is accessible
   nc -z "$REDIS_HOST" "$REDIS_PORT"
   ```

3. **Check Network Connectivity:**
   ```bash
   # Test network connection between services
   ping "$REDIS_HOST"
   ```

### Issue 2: High Memory Usage
**Symptoms:** Memory usage 90%+, scaling alerts

**Solutions:**
1. **Increase Memory Allocation in Coolify:**
   - Go to your application service
   - Increase memory limits
   - Consider horizontal scaling

2. **Optimize Application Memory:**
   ```bash
   # Run memory optimization script
   node scripts/optimize-memory-usage-fixed.js
   ```

### Issue 3: Database Connection Issues
**Symptoms:** "Database connection failed"

**Solutions:**
1. **Verify DATABASE_URL Format:**
   ```bash
   # Should be: postgresql://user:password@host:port/database
   echo "$DATABASE_URL" | grep -E "postgresql://.*@.*:.*\/.*"
   ```

2. **Test Database Connectivity:**
   ```bash
   # Extract and test components
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

### Issue 4: Environment Variables Not Set
**Symptoms:** "NOT SET" for required variables

**Solutions:**
1. **Check Coolify Environment Configuration:**
   - Go to your application service → Environment Variables
   - Ensure all required variables are set
   - Check for typos in variable names

2. **Compare with Template:**
   ```bash
   # Compare with your local .env file
   cat .env | grep -E "(REDIS|DATABASE|SUPABASE)"
   ```

## 🛠️ Advanced Troubleshooting

### Access Container Shell
```bash
# In Coolify dashboard
1. Go to your application service
2. Click "Terminal" tab
3. Run diagnostic commands
```

### Check Application Logs
```bash
# View recent logs
tail -f /app/logs/*.log

# Search for specific errors
grep -i "error\|failed\|timeout" /app/logs/*.log
```

### Network Debugging
```bash
# Check network interfaces
ip addr show

# Test DNS resolution
nslookup "$REDIS_HOST"

# Check routing
traceroute "$REDIS_HOST"
```

### Service Discovery
```bash
# List all running services
docker ps

# Check service networking
docker network ls
docker network inspect coolify-network
```

## 📊 Monitoring Commands

### Real-time Monitoring
```bash
# Monitor memory usage
watch -n 5 'free -h && echo "---" && ps aux --sort=-%mem | head -10'

# Monitor Redis connections
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info | grep -E "(connected_clients|used_memory)"

# Monitor database connections
psql "$DATABASE_URL" -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
```

### Health Checks
```bash
# Application health
curl -f http://localhost:5001/api/health

# Database health
curl -f http://localhost:5001/api/test-db

# Redis health
curl -f http://localhost:5001/api/test-redis
```

## 🚀 Quick Fix Commands

### Emergency Redis Fix
```bash
# If Redis is completely down, switch to memory-only mode
export REDIS_HOST=""
export USE_MEMORY_CACHE=true
```

### Database Connection Retry
```bash
# Force reconnection
export DATABASE_URL="$DATABASE_URL&connect_timeout=10&retry=3"
```

### Memory Cleanup
```bash
# Clear Node.js cache
node -e "console.log('Memory usage before:', process.memoryUsage()); global.gc(); console.log('Memory usage after:', process.memoryUsage());"
```

## 📞 Support Information

If issues persist:
1. Collect all diagnostic information above
2. Check Coolify service logs
3. Review application error logs
4. Verify all environment variables are correctly set
5. Ensure services are properly networked

## 🎯 Success Checklist

- [ ] All environment variables are set
- [ ] Database connection successful
- [ ] Redis/KeyDB connection working
- [ ] Memory usage under 80%
- [ ] Application responding to health checks
- [ ] All services accessible via network

---

**Remember:** Most issues are related to environment variable configuration or service networking in Coolify. Double-check your Coolify dashboard settings first!

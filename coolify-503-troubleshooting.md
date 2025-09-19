# 🚨 Coolify 503 Error Troubleshooting Guide

## 🔍 **REAL PRODUCTION ISSUES** (Not Environment Variables)

Since you have the correct environment variables in Coolify, the 503 error is likely caused by:

### 1. **Container/Build Issues**
- Container failed to build properly
- Container is crashing on startup
- Port binding issues
- Health check failures

### 2. **Coolify Infrastructure Issues**
- Reverse proxy configuration
- Domain routing problems
- SSL certificate issues
- Resource constraints (CPU/Memory)

## 🛠️ **IMMEDIATE DIAGNOSTIC STEPS**

### Step 1: Check Coolify Deployment Logs
1. Go to your Coolify dashboard
2. Navigate to your FloWorx application
3. Click on **"Logs"** tab
4. Look for:
   - Build failures
   - Container startup errors
   - Port binding issues
   - Application crashes

### Step 2: Check Container Status
In Coolify dashboard:
1. Go to **"Resources"** or **"Containers"**
2. Check if the container is:
   - ✅ Running (green)
   - ❌ Stopped (red)
   - ⚠️ Restarting (yellow)

### Step 3: Verify Build Configuration
Check these Coolify settings:
- **Build Command**: Should be empty or `npm run build`
- **Start Command**: Should be `./start.sh` or `node backend/server.js`
- **Port**: Should be `5001`
- **Health Check**: Should be `/api/health`

### Step 4: Check Domain Configuration
1. Verify domain is correctly pointed to Coolify
2. Check SSL certificate status
3. Ensure no DNS caching issues

## 🔧 **COMMON FIXES**

### Fix 1: Force Rebuild
1. In Coolify dashboard
2. Go to your application
3. Click **"Redeploy"** with **"Force rebuild"** checked
4. Wait for complete rebuild

### Fix 2: Check Resource Limits
1. Go to **"Configuration"** → **"Resources"**
2. Increase memory limit to at least **1GB**
3. Increase CPU limit if needed

### Fix 3: Verify Dockerfile
Ensure your `Dockerfile` or `docker-compose.yml` is correct:
- Exposes port 5001
- Has proper health check
- Starts the application correctly

### Fix 4: Check Start Command
In Coolify, verify the start command is one of:
- `./start.sh`
- `node backend/server.js`
- `npm start`

## 🚨 **CRITICAL CHECKS**

### Check 1: Build Logs
Look for these errors in build logs:
```
❌ npm install failed
❌ Frontend build failed
❌ Docker build failed
❌ Permission denied
```

### Check 2: Runtime Logs
Look for these errors in runtime logs:
```
❌ Port 5001 already in use
❌ Database connection failed
❌ Application crashed
❌ Health check failed
```

### Check 3: Health Check
Test the health endpoint directly:
- Should respond at `/api/health`
- Should return `{"status":"ok"}`
- Should respond within 10 seconds

## 🎯 **NEXT STEPS**

1. **Check Coolify logs first** - This will tell you exactly what's wrong
2. **Look for build failures** - Most 503 errors are build-related
3. **Verify container is running** - If not running, check why it's crashing
4. **Test health endpoint** - Ensure the app is actually starting
5. **Check domain/SSL** - Ensure routing is working

## 📞 **WHAT TO LOOK FOR**

When you check the Coolify logs, share:
1. **Build logs** (any errors during build)
2. **Runtime logs** (any errors during startup)
3. **Container status** (running/stopped/restarting)
4. **Resource usage** (CPU/Memory)

## ⚡ **QUICK TEST**

After any changes in Coolify:
1. Wait 2-3 minutes for deployment
2. Test: `curl https://app.floworx-iq.com/api/health`
3. Should return: `{"status":"ok","timestamp":"..."}`

---

**The environment variables are NOT the issue since you have them in Coolify.**
**The issue is with the deployment/container/infrastructure itself.**

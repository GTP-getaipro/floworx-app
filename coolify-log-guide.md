# 🔍 COOLIFY LOG RETRIEVAL GUIDE

## 🎯 CURRENT SITUATION
- ✅ Container deployed successfully at 03:38:40
- ✅ Container is running (`Container r0owwkw4sswwsgs0ck4o088s-033725688073 Started`)
- ❌ Application inside container is failing to start
- ❌ Port 5001 unreachable (ECONNREFUSED)
- ❌ HTTPS returns 503 "no available server"

## 🚨 ROOT CAUSE
**The Node.js application inside the container is crashing or failing to start!**

## 📋 HOW TO GET THE LOGS FROM COOLIFY

### Step 1: Access Coolify Dashboard
1. Open your Coolify dashboard in browser
2. Navigate to your FloWorx application
3. You should see the application status

### Step 2: Check Application Status
Look for:
- **Status**: Should show "Running" or "Unhealthy"
- **Health**: May show "Failed" or "Unhealthy"
- **Last Deployment**: Should show recent timestamp

### Step 3: View Application Logs
1. Click on the **"Logs"** tab
2. Look for logs from the last 15-20 minutes
3. Scroll to find recent entries after 03:38:40

### Step 4: Look for These Specific Log Patterns

#### ✅ GOOD LOGS (Application Started Successfully):
```
🚀 Floworx backend server running on port 5001
📊 Environment: production
🔗 Frontend URL: https://app.floworx-iq.com
🌐 Server accessible on: 0.0.0.0:5001
```

#### ❌ BAD LOGS (Application Failed):
```
Error: connect ECONNREFUSED (database)
Missing environment variable: SUPABASE_URL
Port 5001 already in use
Health check failed
Application crashed
Module not found
Cannot read property of undefined
```

## 🔍 COMMON FAILURE PATTERNS

### 1. Database Connection Issues
```
Error: Database connection failed
Error: Invalid Supabase credentials
Error: Connection timeout
```

### 2. Missing Environment Variables
```
Error: SUPABASE_URL is required
Error: JWT_SECRET not found
Error: Missing required environment variables
```

### 3. Port Binding Issues
```
Error: Port 5001 already in use
Error: Permission denied binding to port
Error: Address already in use
```

### 4. Health Check Failures
```
Health check failed after 3 attempts
Health check timeout
Container unhealthy
```

## 📤 WHAT TO SHARE

Copy and paste the **complete log output** from Coolify, especially:

1. **Any error messages** (lines starting with "Error:", "Failed:", etc.)
2. **Startup sequence** (what happens when container starts)
3. **Health check results** (if any)
4. **Environment variable loading** (if visible)
5. **Database connection attempts** (if any)

## 🎯 EXPECTED OUTCOME

Once we see the logs, we can immediately identify:
- **Exact error causing the failure**
- **Missing configuration**
- **Environment variable issues**
- **Database connection problems**
- **Application code issues**

## 🚀 NEXT STEP

**Go to your Coolify dashboard NOW and share the application logs!**

The container is running perfectly, but your Node.js app is failing inside it. The logs will tell us exactly why.

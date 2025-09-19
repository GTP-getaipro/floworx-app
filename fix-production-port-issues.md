# 🔧 PRODUCTION PORT ISSUES - COMPREHENSIVE FIX

## ✅ **FIXES IMPLEMENTED**

### **1. ConfigManager Port Handling**
```javascript
// OLD (problematic):
port: parseInt(process.env.PORT) || 5001,

// NEW (explicit):
port: process.env.PORT ? Number(process.env.PORT) : 5001,
```
**Why**: Avoids `parseInt(undefined)` becoming `NaN` and silent fallback.

### **2. Server Startup Logging**
Added explicit port logging in `backend/server.js`:
```javascript
console.log(`🔧 Starting server on port ${PORT}, NODE_ENV=${process.env.NODE_ENV}`);
console.log(`🔧 PORT environment variable: ${process.env.PORT}`);
```
**Why**: Debug exactly what port the app thinks it should use.

### **3. Docker Compose Environment**
```yaml
environment:
  - NODE_ENV=production
  - PORT=5001
  - FRONTEND_URL=https://app.floworx-iq.com
# Removed env_file to prevent .env.production from overriding runtime envs
```
**Why**: Prevents `.env.production` from overriding Coolify's runtime environment variables.

### **4. Dockerfile.coolify Explicit PORT**
```dockerfile
# Set explicit PORT environment variable for Coolify
ENV PORT=5001
ENV NODE_ENV=production
```
**Why**: Ensures PORT is always set inside the container.

## 🚨 **CRITICAL COOLIFY CONFIGURATION**

### **Environment Variables in Coolify Dashboard:**
Make sure these are set in Coolify (not in .env files):
```bash
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://app.floworx-iq.com
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=FloWorx2025SecureJWTKeyForProductionUseOnly123456789
ENCRYPTION_KEY=FloWorx2025EncryptionKey32CharLong
DISABLE_REDIS=true
```

### **Coolify Service Configuration:**
- **Port**: 5001
- **Health Check Path**: `/api/health`
- **Health Check Port**: 5001
- **Build Command**: (leave empty)
- **Start Command**: `./start.sh`

## 🔍 **DEBUGGING STEPS**

### **1. Check Container Logs**
In Coolify, look for these startup messages:
```
🔧 Starting server on port 5001, NODE_ENV=production
🔧 PORT environment variable: 5001
✅ All required environment variables are set. Starting server...
🚀 FloworxInvite backend server started
```

### **2. Verify Health Check**
The health check should work:
```bash
# Inside container:
curl -f http://localhost:5001/api/health

# Expected response:
{"status":"ok","timestamp":"2025-09-19T..."}
```

### **3. Check Port Binding**
Ensure Coolify is mapping the correct ports:
- **Container Port**: 5001
- **External Port**: 80/443 (handled by Coolify proxy)

## ⚠️ **COMMON ISSUES TO AVOID**

### **Issue 1: .env.production Override**
- **Problem**: `.env.production` contains `PORT=5001` but Coolify sets different PORT
- **Solution**: Remove `env_file` from docker-compose or ensure .env.production doesn't override

### **Issue 2: Health Check Port Mismatch**
- **Problem**: Health check probes port 5000 but app runs on 5001
- **Solution**: Ensure Dockerfile health check uses correct port

### **Issue 3: Silent Port Fallback**
- **Problem**: `parseInt(undefined)` becomes `NaN`, falls back to 5001 silently
- **Solution**: Use explicit `process.env.PORT ? Number(process.env.PORT) : 5001`

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] **Push changes to main** ✅ (Done)
- [ ] **Verify Coolify environment variables** (PORT=5001)
- [ ] **Force rebuild in Coolify** (to pick up Docker changes)
- [ ] **Monitor build logs** (look for port startup messages)
- [ ] **Test health endpoint** (`curl https://app.floworx-iq.com/api/health`)
- [ ] **Verify container status** (should be "Running")

## 🎯 **EXPECTED OUTCOME**

After deployment, you should see:
1. **Build logs**: Clean Docker build with no errors
2. **Startup logs**: `🔧 Starting server on port 5001, NODE_ENV=production`
3. **Health check**: `{"status":"ok","timestamp":"..."}`
4. **Application**: Accessible at https://app.floworx-iq.com
5. **No 503 errors**: Site loads properly

---

**All fixes are implemented and ready for deployment. Go to Coolify and redeploy now!**

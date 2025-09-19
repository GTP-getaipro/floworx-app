# 🚨 DEPLOY PRODUCTION FIX NOW - IMMEDIATE ACTION PLAN

## ✅ **STEP 1: COMPLETED**
- ✅ Fixed Docker port mismatch (5000 → 5001)
- ✅ Fixed health check endpoint port
- ✅ Pushed to main branch (commit: accf757)

## 🚀 **STEP 2: DEPLOY IN COOLIFY (DO THIS NOW)**

### **Immediate Actions:**

1. **Open Coolify Dashboard**
   - Go to your Coolify instance
   - Navigate to your FloWorx application

2. **Force Redeploy**
   - Click **"Deploy"** or **"Redeploy"**
   - ✅ Check **"Force rebuild"** (important!)
   - Click **"Deploy"**

3. **Monitor Build Process**
   - Watch the **build logs** in real-time
   - Look for successful Docker build
   - Ensure no errors during build

4. **Verify Deployment**
   - Wait 2-3 minutes for complete deployment
   - Check container status shows **"Running"** (green)

## 🧪 **STEP 3: TEST THE FIX**

Run this command to test:
```bash
curl -v https://app.floworx-iq.com/api/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2025-09-19T..."}
```

## 📊 **STEP 4: MONITOR SUCCESS**

### **Success Indicators:**
- ✅ HTTP 200 response from health endpoint
- ✅ Container status: "Running"
- ✅ No 503 errors
- ✅ Application accessible at https://app.floworx-iq.com

### **If Still Failing:**
1. Check Coolify build logs for errors
2. Verify container is actually running
3. Check if Coolify is using the correct Dockerfile
4. Ensure environment variables are still set

## ⚡ **CRITICAL NOTES:**

- **The fix is in the code** - just needs deployment
- **Port mismatch was the root cause** of 503 error
- **Coolify must rebuild** to pick up the Docker changes
- **Force rebuild** ensures clean deployment

## 🎯 **EXPECTED TIMELINE:**
- **Build time**: 3-5 minutes
- **Deployment**: 1-2 minutes
- **Total**: 5-7 minutes to resolution

---

**ACTION REQUIRED: Go to Coolify dashboard and click "Redeploy" with "Force rebuild" NOW!**

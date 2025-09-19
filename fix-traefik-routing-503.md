# 🚨 FIX TRAEFIK ROUTING 503 ERROR - IMMEDIATE ACTION

## 🎯 **ROOT CAUSE IDENTIFIED**
- ✅ Node container is healthy internally (`/health` works)
- ❌ **Traefik can't see healthy backend** → 503 "no available server"
- ❌ **Healthcheck endpoint mismatch** (`/api/health` vs `/health`)
- ❌ **Port configuration mismatch** in Coolify

## ✅ **FIXES APPLIED**

### **1. Fixed Docker Healthchecks**
All Docker files now use `/health` endpoint:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1
```

### **2. Healthcheck Endpoints Available**
Your app has both endpoints:
- `/health` → Simple health check (for Docker/Traefik)
- `/api/health` → Detailed API health check (for monitoring)

## 🚀 **CRITICAL COOLIFY CONFIGURATION**

### **STEP 1: Set Application Port**
1. Go to **Coolify Dashboard**
2. Navigate to your **FloWorx application**
3. Go to **Settings** → **Configuration**
4. Set **"Application Port"** to **`5001`**
5. Save settings

### **STEP 2: Verify Environment Variables**
Ensure these are set in Coolify:
```bash
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://app.floworx-iq.com
# ... other variables
```

### **STEP 3: Force Redeploy**
1. Click **"Deploy"** or **"Redeploy"**
2. ✅ Check **"Force rebuild"**
3. Click **"Deploy"**

## 🔍 **VERIFICATION STEPS**

### **After Deployment:**

1. **Check Container Health**
```bash
docker ps  # Confirm container is running
docker inspect --format='{{.State.Health.Status}}' <container-id>
# Should return: "healthy"
```

2. **Check Container Logs**
```bash
docker logs <container-id> --tail=50
# Look for:
# 🔧 Starting server on port 5001, NODE_ENV=production
# 🚀 FloworxInvite backend server started
```

3. **Test Health Endpoints**
```bash
# Inside container (should work):
curl -f http://localhost:5001/health
# Response: {"status":"healthy","timestamp":"..."}

# External (should work after Traefik routing fixed):
curl https://app.floworx-iq.com/health
```

## ⚡ **EXPECTED TIMELINE**
- **Build**: 3-5 minutes
- **Health check stabilization**: 1-2 minutes
- **Traefik routing update**: 30 seconds
- **Total**: 5-7 minutes

## 🎯 **SUCCESS INDICATORS**

### **Container Level:**
- ✅ `docker ps` shows container running
- ✅ `docker inspect` shows health status: "healthy"
- ✅ Container logs show successful startup

### **Traefik Level:**
- ✅ No more "no available server" errors
- ✅ Traefik routes traffic to healthy container
- ✅ Application accessible at https://app.floworx-iq.com

### **Application Level:**
- ✅ `/health` returns `{"status":"healthy"}`
- ✅ `/api/health` returns detailed status
- ✅ Frontend loads properly
- ✅ No 503 errors

## 🚨 **IF STILL FAILING**

### **Debug Commands:**
```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' <container-id>

# Check health logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' <container-id>

# Test health endpoint directly
docker exec <container-id> curl -f http://localhost:5001/health
```

### **Common Issues:**
1. **Port mismatch**: Ensure Coolify "Application Port" = 5001
2. **Health endpoint**: Ensure `/health` endpoint is accessible
3. **Container not healthy**: Check startup logs for errors
4. **Traefik cache**: Wait 1-2 minutes for routing update

## 📋 **DEPLOYMENT CHECKLIST**

- [ ] **Push changes to main** ✅ (Ready to push)
- [ ] **Set Coolify Application Port to 5001**
- [ ] **Force redeploy in Coolify**
- [ ] **Wait for container to be "healthy"**
- [ ] **Test health endpoints**
- [ ] **Verify application loads**

---

**The healthcheck fix is ready. Now go to Coolify, set port to 5001, and redeploy!**

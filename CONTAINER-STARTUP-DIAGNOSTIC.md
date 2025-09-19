# 🔍 CONTAINER STARTUP DIAGNOSTIC GUIDE

**Status:** Container deployed but service not responding  
**Container ID:** r0owwkw4sswwsgs0ck4o088s-000642871174  
**Issue:** Application may be failing to start inside the container  

---

## 📊 **DEPLOYMENT STATUS ANALYSIS**

### ✅ **Successful Deployment Steps:**
1. **Code Pull:** ✅ Commit 835ed0b6e069100616d9c64b82c70112dd184833 pulled
2. **Docker Image:** ✅ Image found (build skipped - using cached image)
3. **Container Creation:** ✅ Container r0owwkw4sswwsgs0ck4o088s-000642871174 created
4. **Container Start:** ✅ Container started successfully

### ❌ **Current Issue:**
- **Container Status:** Running
- **Service Response:** Not responding (503 "no available server")
- **Likely Cause:** Application failing to start inside container

---

## 🔍 **IMMEDIATE DIAGNOSTIC STEPS**

### **1. Check Container Logs (CRITICAL)**
```bash
# Check current container logs
docker logs r0owwkw4sswwsgs0ck4o088s-000642871174

# Follow logs in real-time
docker logs -f r0owwkw4sswwsgs0ck4o088s-000642871174

# Check last 50 lines
docker logs --tail 50 r0owwkw4sswwsgs0ck4o088s-000642871174
```

### **2. Check Container Status**
```bash
# Verify container is running
docker ps | grep r0owwkw4sswwsgs0ck4o088s

# Check container health
docker inspect r0owwkw4sswwsgs0ck4o088s-000642871174 | grep -A 10 "Health"

# Check container resource usage
docker stats r0owwkw4sswwsgs0ck4o088s-000642871174 --no-stream
```

### **3. Test Internal Connectivity**
```bash
# Test if app is running inside container
docker exec r0owwkw4sswwsgs0ck4o088s-000642871174 curl -f http://localhost:5001/api/health

# Check if port is listening
docker exec r0owwkw4sswwsgs0ck4o088s-000642871174 netstat -tlnp | grep 5001

# Check process status
docker exec r0owwkw4sswwsgs0ck4o088s-000642871174 ps aux
```

---

## 🚨 **LIKELY ISSUES & SOLUTIONS**

### **Issue 1: Environment Variables Missing**
**Symptoms:** Logs show "SUPABASE_URL must be set" or similar
**Solution:** Check Coolify environment variables configuration

### **Issue 2: Start Script Permissions**
**Symptoms:** Logs show "Permission denied" for start.sh
**Solution:** Container should have fixed this, but verify with:
```bash
docker exec r0owwkw4sswwsgs0ck4o088s-000642871174 ls -la /app/start.sh
```

### **Issue 3: Port Binding Issues**
**Symptoms:** Container runs but port 5001 not accessible
**Solution:** Check Coolify port mapping configuration

### **Issue 4: Database Connection Failure**
**Symptoms:** Logs show Supabase connection errors
**Solution:** Verify SUPABASE_URL and keys in environment variables

---

## 🔧 **COOLIFY DASHBOARD ACTIONS**

### **1. Check Application Logs**
1. Go to Coolify dashboard
2. Navigate to your FloWorx application
3. Click on "Logs" tab
4. Look for startup errors or environment variable issues

### **2. Verify Environment Variables**
1. Go to "Environment Variables" section
2. Ensure these are set:
   - `SUPABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `SENDGRID_FROM_NAME`

### **3. Check Port Configuration**
1. Verify port mapping: Container port 5001 → Host port 80/443
2. Ensure domain is properly configured: app.floworx-iq.com

---

## 🎯 **EXPECTED LOG OUTPUT (SUCCESS)**

When working correctly, you should see:
```
✅ Redis configuration found via REDIS_URL
✅ All required environment variables are set. Starting server...
🗄️ Initializing KeyDB cache service...
✅ Database connection established
✅ Authentication configuration validation passed
info: FloworxInvite backend server started {"port":5001}
```

---

## 🚨 **EMERGENCY ACTIONS**

### **If Container Keeps Failing:**
1. **Force Rebuild:**
   ```bash
   # In Coolify, trigger a new deployment with "Force Rebuild" option
   ```

2. **Rollback to Previous Version:**
   ```bash
   # In Coolify, rollback to previous working deployment
   ```

3. **Manual Container Restart:**
   ```bash
   docker restart r0owwkw4sswwsgs0ck4o088s-000642871174
   ```

---

## 📋 **DIAGNOSTIC CHECKLIST**

### **Container Level:**
- [ ] Container is running (`docker ps`)
- [ ] Container logs show startup process
- [ ] No permission errors in logs
- [ ] Environment variables are loaded
- [ ] Port 5001 is listening inside container

### **Application Level:**
- [ ] start.sh script executes successfully
- [ ] Environment validation passes
- [ ] Database connection established
- [ ] Server starts on port 5001
- [ ] Health check endpoint responds

### **Network Level:**
- [ ] Port mapping configured correctly
- [ ] Domain points to correct server
- [ ] SSL/TLS certificate valid
- [ ] No firewall blocking connections

---

## 🎯 **NEXT STEPS**

### **Immediate (Next 5 Minutes):**
1. **Check container logs** for startup errors
2. **Verify environment variables** in Coolify dashboard
3. **Test internal connectivity** inside container

### **If Still Failing (Next 10 Minutes):**
1. **Force rebuild** the container
2. **Check Coolify system logs** for deployment issues
3. **Verify server resources** (CPU, memory, disk)

### **Escalation (If Needed):**
1. **Contact Coolify support** with container logs
2. **Check server infrastructure** status
3. **Consider temporary rollback** to previous version

---

**🔍 Diagnostic Status: CONTAINER RUNNING, APP NOT RESPONDING**  
**🚨 Priority: Check container logs immediately**  
**⏰ Expected Resolution: 5-15 minutes with proper diagnosis**

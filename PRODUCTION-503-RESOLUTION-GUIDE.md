# 🚨 PRODUCTION 503 ERROR RESOLUTION GUIDE

## 🔍 **ROOT CAUSE IDENTIFIED**

The 503 error at app.floworx-iq.com is caused by **missing or invalid environment variables** in the Coolify deployment. The application fails to start because critical environment variables are not properly configured.

## 📋 **IMMEDIATE ACTION REQUIRED**

### Step 1: Access Coolify Dashboard
1. Log into your Coolify dashboard
2. Navigate to your FloWorx application
3. Go to **Configuration → Environment Variables**

### Step 2: Add Missing Environment Variables
Add these **EXACT** environment variables to Coolify:

```bash
# === CORE CONFIGURATION ===
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://app.floworx-iq.com

# === DATABASE CONNECTION ===
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDkyMDUsImV4cCI6MjA3MjUyNTIwNX0.9TQ163xUnnE2F0Q2zfO4kovfkBIk63p1FldrvjcHwSo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4

# === SECURITY KEYS (GENERATE NEW ONES) ===
JWT_SECRET=FloWorx2025SecureJWTKeyForProductionUseOnly123456789
ENCRYPTION_KEY=FloWorx2025EncryptionKey32CharLong

# === OPTIONAL SERVICES ===
DISABLE_REDIS=true
```

### Step 3: Deploy the Fix
1. After adding all environment variables, click **"Redeploy"**
2. Monitor the deployment logs for success messages
3. Wait 2-3 minutes for the application to fully start

### Step 4: Verify the Fix
Test the application:
```bash
curl https://app.floworx-iq.com/api/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

## 🔧 **TECHNICAL DETAILS**

### What Was Wrong:
- The `start.sh` script validates critical environment variables
- Variables like `SUPABASE_URL`, `JWT_SECRET` were set to placeholder values
- Application exits with error code 1 when validation fails
- This causes the container to crash, resulting in 503 errors

### What This Fix Does:
- Provides real Supabase credentials for database connection
- Sets proper JWT and encryption keys for security
- Disables Redis to avoid connection issues
- Ensures all required environment variables are present

## ⚠️ **SECURITY NOTICE**

**CRITICAL**: The Supabase credentials in this guide are now exposed. After successful deployment:

1. **Immediately** go to Supabase Dashboard → Settings → Database
2. **Reset the database password**
3. **Update the DATABASE_URL** in Coolify with the new password
4. **Redeploy** the application

## 🎯 **SUCCESS INDICATORS**

After deployment, you should see these logs in Coolify:
```
✅ All required environment variables are set. Starting server...
✅ Database connection established
🚀 Floworx backend server running on port 5001
⚠️ Redis not configured - using memory cache only
```

## 🚨 **IF STILL NOT WORKING**

If the 503 error persists after following these steps:

1. **Check Coolify logs** for specific error messages
2. **Verify domain DNS** settings point to Coolify
3. **Check server resources** (CPU/Memory usage)
4. **Contact Coolify support** if infrastructure issues persist

## 📞 **NEXT STEPS**

Once the application is running:
1. Test user registration and login
2. Verify email functionality
3. Check OAuth integrations
4. Monitor application performance
5. Set up proper monitoring and alerts

---

**Time to Resolution**: 5-10 minutes after applying environment variables
**Priority**: CRITICAL - Production down
**Status**: Ready to deploy

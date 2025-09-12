# 🔧 COOLIFY DEPLOYMENT ISSUES - COMPLETE FIX

## 🚨 **Issues Identified:**

### 1. KeyDB Connection Error
```
⚠️ KeyDB error: getaddrinfo EAI_AGAIN bgkgcogwgcksc0sccw48c8s0
⚠️ KeyDB connection closed
```

### 2. Database Connection Failure
```
❌ Database initialization failed
Connection refused to 3.98.197.182:6543 and 3.97.240.24:6543
```

### 3. Wrong Database IPs
App is trying to connect to `3.98.197.182` and `3.97.240.24` instead of Supabase

## 🎯 **ROOT CAUSE:**
Environment variables in Coolify are not properly configured or being overridden.

## 🚀 **COMPLETE SOLUTION:**

### **Step 1: Fix Environment Variables in Coolify**

In Coolify Dashboard → **app.floworx-iq** → **Configuration** → **Environment Variables**:

**DELETE any existing DB_* variables and set these:**

```bash
# === DATABASE CONNECTION (Primary) ===
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:Qv5Zwrx1HiH4O1h4@aws-1-ca-central-1.pooler.supabase.com:6543/postgres

# === SUPABASE API ===
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MzE4NzEsImV4cCI6MjA0MTUwNzg3MX0.your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTkzMTg3MSwiZXhwIjoyMDQxNTA3ODcxfQ.your_service_key

# === REDIS/KEYDB (Fix the hostname issue) ===
REDIS_URL=redis://localhost:6379
# OR if you have external Redis:
# REDIS_URL=redis://your-redis-host:6379

# === ENVIRONMENT ===
NODE_ENV=production
PORT=3000

# === SECURITY ===
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# === EMAIL (if using) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# === OAUTH (if using) ===
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback

# === FRONTEND ===
FRONTEND_URL=https://app.floworx-iq.com
```

### **Step 2: Fix KeyDB/Redis Configuration**

The KeyDB error suggests you have a Redis service configured but it's not accessible. 

**Option A: Disable Redis (Simplest)**
Add this environment variable:
```bash
DISABLE_REDIS=true
```

**Option B: Use External Redis**
If you need Redis, use a managed service like:
- Upstash Redis
- Redis Cloud
- Or add Redis to your Coolify setup

### **Step 3: Verify Database Connection Code**

Make sure our DATABASE_URL fix is deployed. Check that `backend/database/unified-connection.js` has the updated code that prioritizes DATABASE_URL.

### **Step 4: Add Connection Debugging**

Temporarily add this to your `server.js` to debug connections:

```javascript
// Add at the top of server.js for debugging
console.log('🔍 ENVIRONMENT DEBUG:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
```

### **Step 5: Deploy and Test**

1. **Save all environment variables in Coolify**
2. **Redeploy the application**
3. **Check logs for:**
   ```
   ✅ Database connection established
   ✅ KeyDB cache service initialized (or disabled)
   ```

## 🧪 **Expected Success Logs:**

After fixing, you should see:
```
🔍 ENVIRONMENT DEBUG:
DATABASE_URL: SET
REDIS_URL: SET
NODE_ENV: production
SUPABASE_URL: SET

✅ Database connection established
   PostgreSQL version: PostgreSQL 17.4
🗄️ KeyDB cache service initialized
✅ Server started on port 3000
```

## 🚨 **If Issues Persist:**

### **Check Coolify Service Dependencies**
1. Go to Coolify Dashboard
2. Check if you have any PostgreSQL or Redis services configured
3. If yes, make sure they're running
4. If no, remove any references to them in environment variables

### **Verify Network Access**
The IPs `3.98.197.182` and `3.97.240.24` suggest your app is trying to connect to some other database. Check:
1. Are there any hardcoded database connections in your code?
2. Are there any other environment variables overriding DATABASE_URL?

### **Debug Network Connectivity**
Add this temporary debug code to test Supabase connectivity:

```javascript
// Temporary debug - add to server.js
const { Pool } = require('pg');
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

testPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ Database test failed:', err.message);
  } else {
    console.log('✅ Database test successful:', res.rows[0]);
  }
  testPool.end();
});
```

## 🔒 **Security Note:**

The credentials shown here were already exposed. **IMMEDIATELY after fixing**:
1. Go to Supabase Dashboard → Settings → Database
2. Reset database password
3. Update DATABASE_URL with new password
4. Redeploy

---

**Priority: Fix environment variables first, then redeploy!** 🎯

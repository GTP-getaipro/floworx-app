# 🔧 COOLIFY DATABASE CONNECTION FIX

## ❌ **Problem Identified:**
Your Floworx app in Coolify is trying to connect to `127.0.0.1:5432` (localhost) instead of Supabase.

**Error from logs:**
```
❌ Database initialization failed: connect ECONNREFUSED 127.0.0.1:5432
```

## 🎯 **Root Cause:**
The environment variables in Coolify are not properly configured for Supabase connection.

## 🚀 **IMMEDIATE SOLUTION:**

### **Step 1: Check Current Coolify Environment Variables**

In your Coolify dashboard:
1. Go to **app.floworx-iq** → **Configuration** → **Environment Variables**
2. Check if these variables are set correctly:

**Required Variables:**
```bash
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=Qv5Zwrx1HiH4O1h4
DB_NAME=postgres
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NODE_ENV=production
```

### **Step 2: Add/Update Environment Variables in Coolify**

1. **In Coolify Dashboard:**
   - Navigate to your app → **Configuration** → **Environment Variables**
   - Add or update these variables:

```bash
# Database Connection (Supabase)
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=Qv5Zwrx1HiH4O1h4
DB_NAME=postgres

# Supabase API
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
NODE_ENV=production
```

### **Step 3: Redeploy**

After updating environment variables:
1. Click **Redeploy** in Coolify
2. Wait for deployment to complete
3. Check logs for successful connection

## 🔍 **Expected Success Logs:**

After fixing, you should see:
```
✅ Database connection established
   PostgreSQL version: PostgreSQL
🔗 New database connection established
```

Instead of:
```
❌ Database initialization failed: connect ECONNREFUSED 127.0.0.1:5432
```

## 🛠️ **Alternative Fix (If Environment Variables Don't Work):**

If Coolify environment variables aren't being loaded properly, we can modify the code to use a connection string:

### **Option A: Use DATABASE_URL**
Add this to Coolify environment variables:
```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:Qv5Zwrx1HiH4O1h4@aws-1-ca-central-1.pooler.supabase.com:6543/postgres
```

### **Option B: Modify Connection Logic**
Update `backend/database/unified-connection.js` to prioritize connection string:

```javascript
getConnectionConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Try DATABASE_URL first, then individual variables
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      // ... other pool config
    };
  }
  
  // Fallback to individual variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    // ... rest of config
  };
}
```

## 🧪 **Testing the Fix:**

After redeployment, check the logs. You should see:
1. ✅ No more `ECONNREFUSED 127.0.0.1:5432` errors
2. ✅ Successful database connection messages
3. ✅ App status changes from "unhealthy" to "healthy"

## 🚨 **Security Note:**

The credentials I'm showing here were already exposed publicly. **Please rotate them immediately** after fixing the connection:

1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Update the new credentials in Coolify
4. Redeploy

---

**The issue is NOT authentication - it's environment variable configuration in Coolify!** 🎯

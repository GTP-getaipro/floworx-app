# 🔧 COOLIFY DNS ISSUE FIX

## ❌ **Problem Identified:**
The Coolify container cannot resolve the hostname `aws-1-ca-central-1.pooler.supabase.com` and is connecting to wrong IPs (`3.97.240.24`, `3.98.197.182`).

## 🚀 **IMMEDIATE SOLUTION:**

### **Option 1: Use Direct Supabase Connection (RECOMMENDED)**

**In Coolify Dashboard → app.floworx-iq → Configuration → Environment Variables:**

**Replace your current DATABASE_URL with:**

```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres
```

**Key Changes:**
- ✅ **Host**: `db.enamhufwobytrfydarsz.supabase.co` (direct connection)
- ✅ **Port**: `5432` (standard PostgreSQL port)
- ✅ **No pooler**: Direct connection to Supabase database

### **Option 2: Use Individual DB Variables (FALLBACK)**

If DATABASE_URL still doesn't work, add these individual variables:

```bash
DB_HOST=db.enamhufwobytrfydarsz.supabase.co
DB_PORT=5432
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=-U9xNc*qP&zyRc4
DB_NAME=postgres
```

### **Option 3: Try Alternative Supabase Endpoints**

If the above doesn't work, try these alternatives:

**Alternative 1 - IPv4 Direct:**
```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@enamhufwobytrfydarsz.supabase.co:5432/postgres
```

**Alternative 2 - With SSL Mode:**
```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres?sslmode=require
```

## 🧪 **Testing Steps:**

1. **Update DATABASE_URL** in Coolify with Option 1
2. **Remove any DB_HOST, DB_PORT** variables if present
3. **Keep these variables:**
   ```bash
   DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres
   SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDkyMDUsImV4cCI6MjA3MjUyNTIwNX0.9TQ163xUnnE2F0Q2zfO4kovfkBIk63p1FldrvjcHwSo
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4
   NODE_ENV=production
   PORT=5001
   DISABLE_REDIS=true
   FRONTEND_URL=https://app.floworx-iq.com
   ```

4. **Redeploy** and check logs

## 📊 **Expected Success Logs:**

```
🔍 Using DATABASE_URL for connection
   DATABASE_URL: postgresql://postgres.enamhufwobytrfydarsz...
✅ Database connection established
   PostgreSQL version: PostgreSQL 17.4
🚀 Floworx backend server running on port 5001
```

## 🔍 **Why This Happens:**

1. **Coolify Container DNS**: The container might not be able to resolve the pooler hostname
2. **Network Restrictions**: Some hosting environments block certain DNS resolutions
3. **Cached DNS**: Old DNS entries might be cached

## 🚨 **If Still Failing:**

If all options fail, the issue might be:
1. **Supabase credentials expired/changed**
2. **Supabase project paused/suspended**
3. **Network firewall blocking connections**

**Try Option 1 first - use the direct Supabase connection without the pooler!** 🚀

# 🔧 Supabase Connection Alternatives for Coolify

## 🔍 **Current Issue**

The application is getting `ECONNREFUSED` errors when trying to connect to Supabase:
- **Current URL:** `aws-1-ca-central-1.pooler.supabase.com:6543` (Transaction Pooler)
- **Error IPs:** `3.98.197.182:6543` and `3.97.240.24:6543`
- **Issue:** Network connectivity from Coolify container to Supabase pooler

## 🎯 **Alternative Connection Methods**

### **Option 1: Direct Database Connection (Recommended)**

Instead of using the transaction pooler, try connecting directly to the database:

```bash
# Current (Pooler - Not Working)
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@aws-1-ca-central-1.pooler.supabase.com:6543/postgres

# Alternative (Direct - Try This)
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres
```

**Benefits:**
- ✅ Uses standard PostgreSQL port (5432)
- ✅ Direct connection without pooler complexity
- ✅ May have better network routing
- ✅ Less likely to be blocked by firewalls

### **Option 2: Session Pooler (Alternative)**

If direct connection doesn't work, try the session pooler:

```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@aws-1-ca-central-1.pooler.supabase.com:5432/postgres
```

**Note:** Same host but port 5432 instead of 6543

### **Option 3: Connection String with SSL Parameters**

Add explicit SSL parameters to ensure proper connection:

```bash
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres?sslmode=require
```

## 🚀 **Immediate Action Plan**

### **Step 1: Update DATABASE_URL in Coolify**

1. Go to Coolify → Configuration → Environment Variables
2. Find `DATABASE_URL`
3. Replace with the direct connection:
   ```
   DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres
   ```
4. Save and redeploy

### **Step 2: Monitor Logs**

After redeployment, check logs for:
- ✅ `✅ Database connection established`
- ✅ `PostgreSQL version: PostgreSQL 15.x`
- ❌ No more `ECONNREFUSED` errors

### **Step 3: Test Application**

Once database connects:
1. Test health endpoint: `https://app.floworx-iq.com/api/health`
2. Test registration/login functionality
3. Verify full application functionality

## 🔍 **Troubleshooting Steps**

### **If Direct Connection Fails:**

1. **Check Supabase Settings:**
   - Verify database is not paused
   - Check if IP restrictions are enabled
   - Ensure connection limit not exceeded

2. **Test from Coolify Server:**
   ```bash
   # SSH into Coolify server and test
   psql "postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres"
   ```

3. **Check Network Connectivity:**
   ```bash
   # Test DNS resolution
   nslookup db.enamhufwobytrfydarsz.supabase.co
   
   # Test port connectivity
   telnet db.enamhufwobytrfydarsz.supabase.co 5432
   ```

### **If All Connections Fail:**

1. **Firewall Issues:**
   - Coolify server may block outbound database connections
   - Contact hosting provider about database access

2. **Supabase Issues:**
   - Check Supabase dashboard for service status
   - Verify project is active and not suspended

3. **Network Routing:**
   - Some hosting providers block certain database ports
   - May need to whitelist Supabase IP ranges

## 🎯 **Expected Results**

### **Before Fix:**
```
🔄 Database connection attempt 1/3
❌ Database connection attempt 1 failed: ECONNREFUSED 3.98.197.182:6543
⏳ Retrying in 2 seconds... (2 attempts remaining)
❌ All database connection attempts failed
```

### **After Fix:**
```
🔄 Database connection attempt 1/3
✅ Database connection established
   PostgreSQL version: PostgreSQL 15.1
   Connection successful on attempt 1
```

## 📝 **Configuration Summary**

**Current Configuration (Not Working):**
- Host: `aws-1-ca-central-1.pooler.supabase.com`
- Port: `6543` (Transaction Pooler)
- Connection Type: Pooled

**Recommended Configuration:**
- Host: `db.enamhufwobytrfydarsz.supabase.co`
- Port: `5432` (Direct)
- Connection Type: Direct

## 🚨 **Priority Action**

**CHANGE THIS IN COOLIFY NOW:**

Replace your current `DATABASE_URL` with:
```
DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres
```

This should resolve the connection issues immediately! 🚀

# 🚀 Supabase REST API Setup - Default Connection Method

## ✅ **What Changed:**

Your application now uses **Supabase REST API as the PRIMARY connection method** instead of direct PostgreSQL connections. This completely bypasses the network connectivity issues you were experiencing with Coolify.

## 🔧 **Required Environment Variables:**

Add these environment variables to your Coolify configuration:

### **Core Supabase Variables:**
```bash
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=[your-supabase-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-supabase-service-role-key]
```

### **Security Variables:**
```bash
ENCRYPTION_KEY=[your-32-character-encryption-key]
JWT_SECRET=[your-jwt-secret]
SESSION_SECRET=[your-session-secret]
```

### **OAuth Variables:**
```bash
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
```

### **Email Variables:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=[your-smtp-user]
SMTP_PASS=[your-smtp-password]
FROM_EMAIL=noreply@app.floworx-iq.com
FROM_NAME=Floworx Team
```

### **n8n Variables:**
```bash
N8N_API_KEY=[your-n8n-api-key]
N8N_BASE_URL=https://n8n.app.floworx-iq.com
```

### **Other Variables:**
```bash
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://app.floworx-iq.com
```

## 🎯 **How to Get Supabase Keys:**

### **1. SUPABASE_URL:**
- Go to your Supabase Dashboard
- Select your project
- Go to **Settings** → **API**
- Copy the **Project URL**

### **2. SUPABASE_ANON_KEY:**
- In the same **Settings** → **API** page
- Copy the **anon public** key

### **3. SUPABASE_SERVICE_ROLE_KEY:**
- In the same **Settings** → **API** page
- Copy the **service_role** key (keep this secret!)

## 🔍 **Benefits of REST API:**

### **✅ Network Connectivity:**
- Uses **HTTPS (port 443)** - never blocked by hosting providers
- No more `ECONNREFUSED` errors
- Works with any hosting platform

### **✅ Built-in Security:**
- **Row Level Security (RLS)** automatically enforced
- **JWT-based authentication** 
- **Encrypted data transmission**

### **✅ Performance:**
- **Built-in caching** at Supabase level
- **Connection pooling** handled automatically
- **Real-time subscriptions** available

### **✅ Scalability:**
- **Auto-scaling** with demand
- **No connection limits** to manage
- **Global CDN** for fast responses

## 🚀 **Expected Results:**

### **Before (PostgreSQL - Failed):**
```
❌ Database connection attempt 1 failed: ECONNREFUSED
❌ All database connection attempts failed
⚠️ Database not available - running in limited mode
```

### **After (REST API - Success):**
```
✅ Supabase REST API client initialized as PRIMARY connection method
✅ Using HTTPS REST API instead of direct PostgreSQL connection
✅ Supabase REST API connection successful
🚀 Floworx backend server running on port 5001
```

## 🔧 **Testing the Connection:**

After adding the environment variables and redeploying:

### **1. Health Check:**
```
https://app.floworx-iq.com/api/health/database
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "database",
  "method": "Supabase REST API",
  "details": {
    "type": "Supabase REST API",
    "connection_method": "Supabase REST API",
    "test_result": "passed"
  }
}
```

### **2. Diagnostic Endpoint:**
```
https://app.floworx-iq.com/api/diagnostics/database-test
```

Should now show successful REST API connections.

## 🎯 **Next Steps:**

1. **Add all required environment variables** to Coolify
2. **Redeploy** the application
3. **Test the health endpoint** to confirm REST API connection
4. **Test application functionality** (registration, login, etc.)

## 🛡️ **Security Notes:**

- **SUPABASE_SERVICE_ROLE_KEY** bypasses RLS - keep it secret
- **SUPABASE_ANON_KEY** is safe to expose in frontend
- **ENCRYPTION_KEY** must be exactly 32 characters
- All OAuth secrets should be kept secure

## 🔄 **Fallback Behavior:**

The system will:
1. **Try REST API first** (primary method)
2. **Fall back to PostgreSQL** if REST API fails
3. **Run in limited mode** if both fail

This ensures maximum reliability and compatibility.

## 🎉 **Benefits Summary:**

- ✅ **No more network connectivity issues**
- ✅ **Works with any hosting provider**
- ✅ **Better security with RLS**
- ✅ **Improved performance and scalability**
- ✅ **Real-time capabilities available**
- ✅ **Automatic connection management**

**Add the environment variables to Coolify and redeploy to activate REST API mode!** 🚀

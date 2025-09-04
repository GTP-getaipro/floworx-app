# 🚨 FLOWORX PRODUCTION RECOVERY PLAN

## **CRITICAL STATUS: IMMEDIATE ACTION REQUIRED**

**Current Issues:**
- ❌ Database connection failing (Supabase API keys invalid)
- ❌ User registration broken (500 errors)
- ❌ User login not working
- ✅ Password reset endpoint implemented (needs testing)

---

## **🎯 PHASE 1: FIX SUPABASE CONNECTION (CRITICAL)**

### **Step 1: Verify Supabase Project Status**
```bash
# 1. Go to Supabase Dashboard
# URL: https://supabase.com/dashboard
# Project: enamhufwobytrfydarsz
```

**Manual Verification Checklist:**
- [ ] Project is active (not paused)
- [ ] Project URL is: `https://enamhufwobytrfydarsz.supabase.co`
- [ ] Database is running
- [ ] Users table exists

### **Step 2: Regenerate API Keys**
```bash
# In Supabase Dashboard:
# 1. Go to Settings > API
# 2. Copy the current keys:
#    - anon/public key
#    - service_role key
# 3. If keys don't work, regenerate them
```

### **Step 3: Update Vercel Environment Variables**
```bash
# Update Supabase URL (if changed)
vercel env rm SUPABASE_URL
vercel env add SUPABASE_URL
# Enter: https://enamhufwobytrfydarsz.supabase.co

# Update Anon Key
vercel env rm SUPABASE_ANON_KEY
vercel env add SUPABASE_ANON_KEY
# Enter: [NEW_ANON_KEY_FROM_DASHBOARD]

# Update Service Role Key
vercel env rm SUPABASE_SERVICE_ROLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter: [NEW_SERVICE_ROLE_KEY_FROM_DASHBOARD]
```

### **Step 4: Verify Database Schema**
```sql
-- Run in Supabase SQL Editor
-- Check if users table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- If users table doesn't exist, create it:
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for service role access)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (true);
```

### **Step 5: Redeploy Application**
```bash
# Redeploy to apply new environment variables
git add .
git commit -m "Fix: Update Supabase configuration and add password reset endpoint"
git push
vercel --prod
```

---

## **🧪 PHASE 2: TEST FIXES**

### **Step 1: Test Supabase Connection**
```bash
# Test with real credentials
node test-real-supabase-connection.js
```

### **Step 2: Test Production Functionality**
```bash
# Run comprehensive production tests
node test-production-functionality.js
```

### **Step 3: Test Password Reset**
```bash
# Test new password reset endpoint
curl -X POST https://app.floworx-iq.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## **🔧 PHASE 3: ADDITIONAL FIXES**

### **Missing Endpoints to Implement:**
1. **Password Reset Confirmation** - `/api/auth/reset-password`
2. **Email Verification** - `/api/auth/verify-email`
3. **Resend Verification** - `/api/auth/resend-verification`

### **Security Enhancements:**
1. **Rate Limiting** - Implement proper rate limiting
2. **Input Validation** - Enhanced validation middleware
3. **Security Headers** - Add missing security headers

---

## **📊 PHASE 4: MONITORING & VALIDATION**

### **Health Check Commands:**
```bash
# 1. API Health
curl https://app.floworx-iq.com/api/health

# 2. Database Connection
curl https://app.floworx-iq.com/api/health/db

# 3. User Registration Test
curl -X POST https://app.floworx-iq.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "password": "TestPassword123!",
    "businessName": "Test Company",
    "agreeToTerms": true
  }'

# 4. User Login Test
curl -X POST https://app.floworx-iq.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

---

## **🚀 QUICK RECOVERY SCRIPT**

Create and run this script for automated recovery:

```bash
#!/bin/bash
# quick-recovery.sh

echo "🚀 Starting Floworx Production Recovery..."

# Step 1: Test current status
echo "📊 Testing current status..."
node test-production-functionality.js

# Step 2: Test Supabase connection
echo "🔌 Testing Supabase connection..."
node test-real-supabase-connection.js

# Step 3: If tests fail, redeploy
if [ $? -ne 0 ]; then
    echo "❌ Tests failed, redeploying..."
    git add .
    git commit -m "Recovery: Fix production issues"
    git push
    vercel --prod
    
    # Wait for deployment
    sleep 30
    
    # Test again
    echo "🧪 Testing after deployment..."
    node test-production-functionality.js
fi

echo "✅ Recovery process completed!"
```

---

## **📋 SUCCESS CRITERIA**

**Phase 1 Complete When:**
- [ ] Supabase connection test passes
- [ ] Database shows `connected: true`
- [ ] Users table accessible

**Phase 2 Complete When:**
- [ ] User registration returns 201 (success)
- [ ] User login returns 200 with token
- [ ] Password reset returns 200

**Phase 3 Complete When:**
- [ ] All API endpoints return expected responses
- [ ] No 500 errors in production
- [ ] Success rate > 90%

---

## **🆘 EMERGENCY CONTACTS & RESOURCES**

**Supabase Dashboard:** https://supabase.com/dashboard
**Vercel Dashboard:** https://vercel.com/dashboard
**Project Repository:** https://github.com/GTP-getaipro/floworx-app

**Key Files:**
- `api/index.js` - Main API handler
- `api/_lib/database.js` - Supabase connection
- `test-production-functionality.js` - Production tests
- `test-real-supabase-connection.js` - Supabase tests

---

## **📈 MONITORING SETUP**

After recovery, implement:
1. **Health Check Monitoring** - Every 5 minutes
2. **Error Rate Alerts** - If > 5% error rate
3. **Database Connection Monitoring** - Continuous
4. **User Registration Success Rate** - Daily reports

---

**NEXT IMMEDIATE ACTION:** 
1. Go to Supabase dashboard
2. Verify project status
3. Regenerate API keys if needed
4. Update Vercel environment variables
5. Redeploy application

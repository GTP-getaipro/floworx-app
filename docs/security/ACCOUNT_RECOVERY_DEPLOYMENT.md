# 🚀 FloWorx Account Recovery System - SAFE DEPLOYMENT GUIDE

## ⚠️ CRITICAL: Read This First

The error you encountered (`column "risk_score" does not exist`) indicates there may be existing tables with different schemas. This deployment guide ensures **zero downtime** and **no data loss**.

## 📋 Schema Review Summary

Based on your existing FloWorx database structure, here are the key findings:

### ✅ **Compatibility Assessment**
- **No table conflicts**: All new tables use unique names
- **Safe column additions**: Uses `ADD COLUMN IF NOT EXISTS` 
- **Proper foreign keys**: All references to `users(id)` are correct
- **UUID consistency**: Maintains your existing UUID pattern

### ⚠️ **Issues Identified & Fixed**
1. **RLS Policies**: Updated for your custom JWT authentication
2. **Function Security**: Enhanced with proper privilege escalation
3. **Progressive Migration**: Created safe migration scripts
4. **Error Handling**: Added comprehensive error checking

## 🔄 Safe Deployment Process

### **Step 1: Run Safe Migration Script**
Execute in your Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- backend/database/safe-account-recovery-migration.sql
```

**What this does:**
- ✅ Safely adds columns to existing tables
- ✅ Creates new tables only if they don't exist
- ✅ Handles existing table conflicts gracefully
- ✅ Provides detailed progress notifications

### **Step 2: Configure RLS Policies**
Execute in your Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- backend/database/account-recovery-rls-policies.sql
```

**What this does:**
- ✅ Creates JWT-compatible RLS policies
- ✅ Works with your custom authentication system
- ✅ Provides proper multi-tenant security
- ✅ Grants necessary permissions

### **Step 3: Install Database Functions**
Execute in your Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of:
-- backend/database/account-recovery-functions.sql
```

**What this does:**
- ✅ Creates secure, optimized functions
- ✅ Implements progressive lockout logic
- ✅ Provides comprehensive audit logging
- ✅ Includes cleanup utilities

## 🔧 Backend Configuration

### **Environment Variables**
Your `.env.production` already has the correct settings:

```env
ACCOUNT_RECOVERY_TOKEN_EXPIRY=86400000  # 24 hours
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900000         # 15 minutes
PROGRESSIVE_LOCKOUT_MULTIPLIER=2
```

## 🎯 Testing Strategy

### **1. Database Testing**
```sql
-- Test the migration worked correctly
SELECT 
    'users' as table_name,
    COUNT(*) as row_count,
    COUNT(failed_login_attempts) as has_recovery_fields
FROM users
UNION ALL
SELECT 
    'password_reset_tokens',
    COUNT(*),
    COUNT(attempt_count)
FROM password_reset_tokens;
```

### **2. API Testing**
```bash
# Test account lockout check
curl -X POST http://localhost:5000/api/account-recovery/check-lockout \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 🚨 Troubleshooting

### **Common Issues & Solutions**

#### **1. "Column does not exist" Error**
```sql
-- Check if column exists before using
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'security_audit_log' 
AND column_name = 'risk_score';

-- If missing, add it manually:
ALTER TABLE security_audit_log 
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0 
CHECK (risk_score >= 0 AND risk_score <= 100);
```

#### **2. RLS Policy Conflicts**
```sql
-- Drop all existing policies and recreate
DROP POLICY IF EXISTS "existing_policy_name" ON table_name;
-- Then run the RLS policies script again
```

## ✅ Deployment Verification

After deployment, verify these work:

- [ ] Users can request password resets
- [ ] Account lockout triggers after 5 failed attempts
- [ ] Progressive lockout increases duration
- [ ] Recovery emails are sent successfully
- [ ] Multi-step recovery wizard works
- [ ] Emergency access provides limited functionality
- [ ] Security events are logged properly
- [ ] RLS policies protect user data
- [ ] Cleanup functions remove expired data

---

**🔐 FloWorx Account Recovery System**  
*Secure, scalable, and production-ready account recovery*

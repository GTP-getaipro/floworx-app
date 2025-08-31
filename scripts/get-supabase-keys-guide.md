# 🔑 Get Supabase Auth Keys - Step-by-Step Guide

## **🎯 What You Need**
You need to obtain two critical keys from your Supabase dashboard:
- `SUPABASE_ANON_KEY` - For client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side admin operations

## **📍 Step-by-Step Instructions**

### **Step 1: Access Your Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: **enamhufwobytrfydarsz** (Floworx project)

### **Step 2: Navigate to API Settings**
1. In the left sidebar, click on **"Settings"** (gear icon)
2. Click on **"API"** in the settings menu
3. You should see the "Project API keys" section

### **Step 3: Copy the Keys**

#### **SUPABASE_ANON_KEY (Public Key)**
- Look for **"anon public"** key
- This key starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Click the **copy button** next to it
- This key is safe to use in client-side code

#### **SUPABASE_SERVICE_ROLE_KEY (Secret Key)**
- Look for **"service_role"** key  
- This key also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Click the **copy button** next to it
- ⚠️ **KEEP THIS SECRET** - Never expose in client-side code

### **Step 4: Get Your Project URL**
- In the same API settings page, copy your **"Project URL"**
- Should be: `https://enamhufwobytrfydarsz.supabase.co`

## **🔧 Update Environment Files**

Once you have the keys, update these files:

### **1. Root .env file**
```env
# Add these lines:
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_service_role_key
```

### **2. backend/.env file**
```env
# Add these lines:
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_service_role_key
```

### **3. backend/.env.production file**
```env
# Update these lines:
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_actual_service_role_key
```

## **✅ Verification Commands**

After updating the environment files, run these commands to verify:

### **1. Test Environment Loading**
```bash
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌'); console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌'); console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');"
```

### **2. Run Environment Validation**
```bash
node scripts/validate-environment.js
```

### **3. Test Supabase Connection**
```bash
node scripts/test-supabase-integration.js
```

## **🔒 Security Notes**

### **SUPABASE_ANON_KEY**
- ✅ Safe for client-side use
- ✅ Can be exposed in frontend code
- ✅ Has limited permissions (RLS policies apply)

### **SUPABASE_SERVICE_ROLE_KEY**
- ❌ **NEVER** expose in client-side code
- ❌ **NEVER** commit to version control
- ✅ Only use in server-side code
- ✅ Has admin privileges (bypasses RLS)

## **🚨 What These Keys Enable**

### **With SUPABASE_ANON_KEY**
- Client-side authentication
- Row Level Security (RLS) enforced queries
- Public API access with user context

### **With SUPABASE_SERVICE_ROLE_KEY**
- Admin operations (bypasses RLS)
- User management functions
- Database schema modifications
- Bulk operations

## **📱 Visual Guide**

When you're in the Supabase dashboard API settings, you'll see:

```
Project API keys
├── anon public    [copy button] ← This is SUPABASE_ANON_KEY
├── service_role   [copy button] ← This is SUPABASE_SERVICE_ROLE_KEY
└── Project URL: https://enamhufwobytrfydarsz.supabase.co
```

## **🔄 Next Steps**

After obtaining and configuring the keys:

1. ✅ Update all environment files
2. ✅ Run validation script
3. ✅ Test Supabase integration
4. ✅ Proceed to email service configuration
5. ✅ Deploy to production

## **❓ Troubleshooting**

### **Keys Not Working?**
- Verify you copied the complete key (they're very long)
- Check for extra spaces or line breaks
- Ensure you're using the correct project keys

### **Permission Errors?**
- Verify RLS policies are properly configured
- Check if you're using the right key for the operation
- Ensure user authentication is working

### **Connection Issues?**
- Verify SUPABASE_URL matches your project
- Check network connectivity
- Verify environment variables are loading correctly

# 🔧 Floworx SaaS Environment Configuration Guide

## **📋 Environment Variables Checklist**

### **✅ Currently Configured**
- ✅ Database connection (Supabase transaction pooler)
- ✅ JWT secret (128 characters, secure)
- ✅ Encryption key (32 characters, AES-256 compatible)
- ✅ Google OAuth credentials
- ✅ Basic server configuration

### **❌ Missing Critical Variables**
- ❌ Supabase Auth keys (SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- ❌ n8n integration URLs and API keys
- ❌ Email service configuration
- ❌ Production URLs (currently using development localhost)
- ❌ Security and monitoring configuration

---

## **🔑 Required Actions**

### **1. Get Supabase Auth Keys**

**Location**: Supabase Dashboard → Settings → API

```env
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get them**:
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "anon public" key for `SUPABASE_ANON_KEY`
4. Copy the "service_role" key for `SUPABASE_SERVICE_ROLE_KEY`

### **2. Configure n8n Integration**

**Setup n8n instance** (if not already done):
```bash
# Option 1: n8n Cloud (recommended)
# Sign up at https://n8n.io/cloud

# Option 2: Self-hosted
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

**Get n8n credentials**:
```env
N8N_BASE_URL=https://your-instance.n8n.cloud
N8N_API_KEY=your_n8n_api_key
N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/floworx-master
```

### **3. Setup Email Service**

**Option 1: Gmail SMTP** (recommended for development):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password  # Generate in Google Account settings
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
```

**Option 2: SendGrid** (recommended for production):
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
```

### **4. Update Google OAuth Settings**

**Google Cloud Console** → APIs & Services → Credentials:

**Authorized redirect URIs** (add both):
- Development: `http://localhost:5001/api/oauth/google/callback`
- Production: `https://floworx-app.vercel.app/api/oauth/google/callback`

### **5. Generate Additional Security Keys**

```bash
# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate additional encryption keys if needed
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## **🚀 Vercel Deployment Configuration**

### **Environment Variables to Add in Vercel Dashboard**

**Database & Auth**:
```
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=-U9xNc*qP&zyRc4
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Security**:
```
JWT_SECRET=a967c6e0599f353537f76d2f1e49ebd407589db3a30f441611191656b6bdf9870273c4739caa10e5af420196aa037b57a6fb170af37b008b3ad4f42eb8e634f3
ENCRYPTION_KEY=Imfoq4i6ReG/OMYPFlKpaF3oz8hgeGkc
SESSION_SECRET=your_generated_session_secret
```

**OAuth & External Services**:
```
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_REDIRECT_URI=https://floworx-app.vercel.app/api/oauth/google/callback
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=your_n8n_base_url
```

**Email & Notifications**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
```

**Server Configuration**:
```
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://floworx-app.vercel.app
LOG_LEVEL=warn
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## **🔒 Security Best Practices**

### **1. Environment Variable Security**
- ✅ Never commit `.env` files to version control
- ✅ Use different keys for development and production
- ✅ Rotate secrets regularly (quarterly recommended)
- ✅ Use strong, randomly generated secrets

### **2. Database Security**
- ✅ Use transaction pooler for serverless deployment
- ✅ Enable Row Level Security (RLS) - already implemented
- ✅ Limit database user permissions
- ✅ Monitor database access logs

### **3. OAuth Security**
- ✅ Restrict redirect URIs to known domains
- ✅ Use HTTPS for all OAuth callbacks
- ✅ Implement proper token refresh logic
- ✅ Store tokens encrypted (already implemented)

### **4. API Security**
- ✅ Implement rate limiting (configured)
- ✅ Use CORS properly (configured)
- ✅ Validate all inputs
- ✅ Log security events

---

## **🧪 Testing Configuration**

### **1. Test Database Connection**
```bash
node database/check-schema.js
```

### **2. Test Environment Variables**
```bash
node -e "
require('dotenv').config();
console.log('DB_HOST:', process.env.DB_HOST ? '✅' : '❌');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅' : '❌');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅' : '❌');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
"
```

### **3. Test API Endpoints**
```bash
# Test health endpoint
curl https://your-deployment-url.vercel.app/api/health

# Test database connection
curl https://your-deployment-url.vercel.app/api/test-db
```

---

## **📝 Next Steps**

1. **Complete missing environment variables** (Supabase keys, n8n config, email)
2. **Update Google OAuth settings** (add production redirect URI)
3. **Configure Vercel environment variables**
4. **Test deployment** with all endpoints
5. **Setup monitoring** (Sentry, logging)
6. **Configure custom domain** (optional)

---

## **🆘 Troubleshooting**

### **Common Issues**:
- **Database connection fails**: Check transaction pooler settings
- **OAuth redirect mismatch**: Verify Google Console redirect URIs
- **CORS errors**: Ensure FRONTEND_URL matches deployed domain
- **Token encryption fails**: Verify ENCRYPTION_KEY is 32 characters
- **n8n webhook fails**: Check n8n instance accessibility

### **Debug Commands**:
```bash
# Check environment loading
node -e "require('dotenv').config(); console.log(process.env)"

# Test database connection
node database/check-schema.js

# Test Supabase client
node -e "const client = require('./backend/database/supabase-client'); console.log('Client created successfully')"
```

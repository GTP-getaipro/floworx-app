# 🚀 Floworx Production Deployment Guide

## **📋 Pre-Deployment Checklist**

### **✅ Environment Variables Status**
- ✅ DB_HOST: Configured
- ✅ DB_PORT: Configured
- ✅ DB_NAME: Configured
- ✅ DB_USER: Configured
- ✅ DB_PASSWORD: Configured
- ✅ SUPABASE_URL: Configured
- ✅ SUPABASE_ANON_KEY: Configured
- ✅ SUPABASE_SERVICE_ROLE_KEY: Configured
- ✅ JWT_SECRET: Configured
- ✅ ENCRYPTION_KEY: Configured
- ✅ GOOGLE_CLIENT_ID: Configured
- ✅ GOOGLE_CLIENT_SECRET: Configured
- ✅ N8N_WEBHOOK_URL: Configured
- ✅ N8N_API_KEY: Configured
- ✅ N8N_BASE_URL: Configured
- ✅ SMTP_HOST: Configured
- ✅ SMTP_PORT: Configured
- ✅ SMTP_USER: Configured
- ✅ SMTP_PASS: Configured
- ✅ FROM_EMAIL: Configured
- ✅ FROM_NAME: Configured



## **🔧 Vercel Deployment Steps**

### **Step 1: Deploy to Vercel**
```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy from root directory
vercel --prod
```

### **Step 2: Configure Environment Variables**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Floworx project
3. Go to Settings → Environment Variables
4. Copy variables from `vercel-environment-variables.txt`
5. Set each variable for **Production** environment

### **Step 3: Update Google OAuth Settings**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Add production redirect URI:
   `https://floworx-app.vercel.app/api/oauth/google/callback`

### **Step 4: Test Production Deployment**
1. Visit your deployed URL
2. Test user registration/login
3. Test Google OAuth flow
4. Test email notifications
5. Test n8n webhook integration

## **🔒 Security Checklist**

- ✅ All secrets are stored in Vercel environment variables
- ✅ No sensitive data in code repository
- ✅ Production URLs configured (no localhost)
- ✅ HTTPS enabled for all endpoints
- ✅ CORS configured for production frontend

## **📊 Production URLs**

- **Backend API**: https://floworx-app.vercel.app
- **Frontend**: https://floworx-app.vercel.app
- **OAuth Callback**: https://floworx-app.vercel.app/api/oauth/google/callback

## **🧪 Post-Deployment Testing**

### **Test OAuth Flow**
```bash
curl -I "https://your-deployment-url.vercel.app/api/oauth/google"
```

### **Test Database Connection**
```bash
curl "https://your-deployment-url.vercel.app/api/health"
```

### **Test Email Service**
- Register a new user
- Verify email verification is sent
- Complete onboarding flow

## **🚨 Troubleshooting**

### **Common Issues:**
1. **OAuth redirect mismatch**: Update Google Cloud Console redirect URIs
2. **Database connection fails**: Check Supabase connection pooler settings
3. **Email not sending**: Verify Gmail App Password is correct
4. **CORS errors**: Ensure FRONTEND_URL matches deployed domain

### **Debug Commands:**
```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test specific endpoints
curl -v "https://your-deployment-url.vercel.app/api/health"
```

## **📈 Monitoring & Maintenance**

1. **Set up monitoring** for API endpoints
2. **Monitor email delivery** rates
3. **Check n8n workflow** execution logs
4. **Review Supabase** usage and performance
5. **Update dependencies** regularly

## **🔄 Custom Domain Setup (Optional)**

When ready to use `app.floworx-iq.com`:

1. **Add custom domain** in Vercel dashboard
2. **Update environment variables**:
   - `FRONTEND_URL=https://app.floworx-iq.com`
   - `GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback`
3. **Update Google OAuth** redirect URIs
4. **Test all integrations** with new domain

---

**🎉 Your Floworx SaaS is ready for production deployment!**

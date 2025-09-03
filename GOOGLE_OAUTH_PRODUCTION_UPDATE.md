# 🔐 Google OAuth Production Configuration Update

## **URGENT: Update Required for app.floworx-iq.com**

The FloWorx SaaS application is now live at **https://app.floworx-iq.com/** and requires Google OAuth configuration updates.

---

## **📋 Required Actions**

### **1. Update Google Cloud Console**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Navigate to**: APIs & Services → Credentials
3. **Select your OAuth 2.0 Client ID**: `636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com`

### **2. Update Authorized Redirect URIs**

**Add these URIs** (keep existing ones for development):

```
https://app.floworx-iq.com/api/oauth/google/callback
http://localhost:5001/api/oauth/google/callback
```

**Remove old URIs** (if present):
```
https://floworx-app.vercel.app/api/oauth/google/callback
https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback
```

### **3. Update Authorized JavaScript Origins**

**Add these origins**:
```
https://app.floworx-iq.com
http://localhost:3000
http://localhost:5001
```

---

## **🔧 Environment Variables Updated**

The following environment variables have been updated in the codebase:

✅ **GOOGLE_REDIRECT_URI**: `https://app.floworx-iq.com/api/oauth/google/callback`  
✅ **FRONTEND_URL**: `https://app.floworx-iq.com`  
✅ **COOKIE_DOMAIN**: `.floworx-iq.com`  
✅ **NODE_ENV**: `production`  

---

## **🚀 Vercel Environment Variables**

Ensure these are set in your Vercel dashboard:

```bash
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
FRONTEND_URL=https://app.floworx-iq.com
COOKIE_DOMAIN=.floworx-iq.com
NODE_ENV=production
```

---

## **✅ Verification Steps**

After updating Google OAuth settings:

1. **Test OAuth Flow**: Visit https://app.floworx-iq.com/login
2. **Click "Sign in with Google"**
3. **Verify redirect works correctly**
4. **Check user authentication completes**

---

## **🔍 Troubleshooting**

If OAuth fails:
- Check Google Cloud Console redirect URIs match exactly
- Verify Vercel environment variables are set
- Check browser developer tools for CORS errors
- Ensure custom domain is properly configured in Vercel

---

## **📞 Support**

If you encounter issues, check:
- Google Cloud Console OAuth configuration
- Vercel environment variables
- Domain DNS settings
- Application logs in Vercel dashboard

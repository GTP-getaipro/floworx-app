# 🔐 Google OAuth Production Setup Guide

## 🚨 **CRITICAL: OAuth Not Configured in Production**

**Current Status**: Google OAuth environment variables are missing in production
**Impact**: Users cannot sign in with Google OAuth
**Priority**: HIGH - Required for full application functionality

---

## 📋 **REQUIRED ENVIRONMENT VARIABLES**

Add these to your **Coolify Environment Variables**:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[YOUR_ACTUAL_SECRET]
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
```

---

## 🔧 **STEP-BY-STEP SETUP**

### **Step 1: Google Cloud Console Configuration**

1. **Access Google Cloud Console**:
   - Go to: https://console.cloud.google.com/
   - Navigate to: APIs & Services → Credentials

2. **Update OAuth 2.0 Client**:
   - Find client ID: `636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com`
   - Click to edit the OAuth client

3. **Update Authorized Redirect URIs**:
   ```
   ✅ ADD THESE:
   https://app.floworx-iq.com/api/oauth/google/callback
   http://localhost:5001/api/oauth/google/callback (for development)
   
   ❌ REMOVE OLD ONES:
   https://floworx-app.vercel.app/api/oauth/google/callback
   https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback
   ```

4. **Update Authorized JavaScript Origins**:
   ```
   ✅ ADD THESE:
   https://app.floworx-iq.com
   http://localhost:3000 (for development)
   http://localhost:5001 (for development)
   ```

5. **Save Changes** in Google Cloud Console

### **Step 2: Coolify Environment Variables**

1. **Access Coolify Dashboard**:
   - Login to your Coolify instance
   - Navigate to FloWorx project
   - Go to Environment Variables section

2. **Add OAuth Variables**:
   ```bash
   GOOGLE_CLIENT_ID=636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-[GET_FROM_GOOGLE_CONSOLE]
   GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
   ```

3. **Restart Application**:
   - Deploy/restart the FloWorx application
   - Wait for deployment to complete

### **Step 3: Verification**

1. **Test OAuth Health Check**:
   ```bash
   curl https://app.floworx-iq.com/api/health/oauth
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "oauth",
     "configuration": "complete"
   }
   ```

2. **Test OAuth Flow**:
   - Visit: https://app.floworx-iq.com/login
   - Click "Sign in with Google"
   - Should redirect to Google consent screen
   - After consent, should redirect back to app successfully

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues & Solutions**

#### **Issue 1: "OAuth configuration error"**
```
❌ Error: OAuth service is not properly configured
✅ Solution: Verify all 3 environment variables are set in Coolify
```

#### **Issue 2: "redirect_uri_mismatch"**
```
❌ Error: The redirect URI in the request does not match
✅ Solution: Ensure Google Console redirect URI matches exactly:
   https://app.floworx-iq.com/api/oauth/google/callback
```

#### **Issue 3: "invalid_client"**
```
❌ Error: Invalid OAuth client credentials
✅ Solution: Verify GOOGLE_CLIENT_SECRET is correct in Coolify
```

#### **Issue 4: CORS errors**
```
❌ Error: CORS policy blocking OAuth requests
✅ Solution: Verify JavaScript origins in Google Console include:
   https://app.floworx-iq.com
```

---

## 📊 **VALIDATION CHECKLIST**

### **Google Cloud Console:**
- [ ] OAuth client exists and is active
- [ ] Redirect URI: `https://app.floworx-iq.com/api/oauth/google/callback`
- [ ] JavaScript origin: `https://app.floworx-iq.com`
- [ ] Client ID and Secret are valid

### **Coolify Environment:**
- [ ] `GOOGLE_CLIENT_ID` is set
- [ ] `GOOGLE_CLIENT_SECRET` is set
- [ ] `GOOGLE_REDIRECT_URI` is set to production URL
- [ ] Application restarted after adding variables

### **Application Testing:**
- [ ] Health check `/api/health/oauth` returns "healthy"
- [ ] Login page shows "Sign in with Google" button
- [ ] OAuth flow redirects to Google successfully
- [ ] After consent, redirects back to app
- [ ] User can complete OAuth login

---

## 🚀 **EXPECTED RESULTS**

### **After Successful Configuration:**
- ✅ OAuth health check passes
- ✅ Google sign-in button functional
- ✅ Users can authenticate with Google
- ✅ OAuth tokens stored securely
- ✅ User sessions work correctly

### **Performance Impact:**
- 🎯 Improved user experience (social login)
- 🎯 Reduced registration friction
- 🎯 Enhanced security (Google OAuth)
- 🎯 Better user onboarding flow

---

## 📞 **SUPPORT RESOURCES**

### **Documentation:**
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Coolify Environment Variables: [Coolify Docs]

### **Testing Tools:**
- OAuth Health Check: `https://app.floworx-iq.com/api/health/oauth`
- System Health: `https://app.floworx-iq.com/api/health/system`

---

## ⏰ **COMPLETION TIMELINE**

**Estimated Time**: 30-45 minutes
**Priority**: HIGH - Complete within 2 hours
**Dependencies**: Access to Google Cloud Console and Coolify Dashboard

---

**🎯 Once completed, OAuth functionality will be fully operational in production!**

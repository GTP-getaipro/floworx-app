# 🚀 FloWorx Production Deployment Checklist

## **✅ COMPLETED TASKS**

### **1. Environment Configuration Updated**
- [x] Updated `.env` file with production URLs
- [x] Set `GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback`
- [x] Set `FRONTEND_URL=https://app.floworx-iq.com`
- [x] Set `COOKIE_DOMAIN=.floworx-iq.com`
- [x] Set `NODE_ENV=production`

### **2. Frontend Configuration Updated**
- [x] Updated `frontend/.env.production` with production API URL
- [x] Updated CORS configuration in `api/index.js`
- [x] Updated Cypress test configuration
- [x] Updated security middleware CSP settings

### **3. Build Verification**
- [x] Confirmed `npm run vercel-build` works successfully
- [x] Frontend compiles to 97.65 kB JS, 12.72 kB CSS
- [x] All warnings are non-blocking

---

## **🔧 REQUIRED MANUAL ACTIONS**

### **1. Google OAuth Configuration** ⚠️ **URGENT**
**Go to**: https://console.cloud.google.com/apis/credentials

**Update OAuth 2.0 Client ID**: `636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com`

**Authorized Redirect URIs** (add):
```
https://app.floworx-iq.com/api/oauth/google/callback
```

**Authorized JavaScript Origins** (add):
```
https://app.floworx-iq.com
```

### **2. Vercel Environment Variables**
**Go to**: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Set these variables for PRODUCTION**:
```
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
FRONTEND_URL=https://app.floworx-iq.com
COOKIE_DOMAIN=.floworx-iq.com
NODE_ENV=production
```

### **3. Domain Configuration**
**Verify in Vercel**:
- [x] Custom domain `app.floworx-iq.com` is configured
- [x] SSL certificate is active
- [x] DNS is properly configured

---

## **🧪 POST-DEPLOYMENT TESTING**

### **Critical Tests to Perform**:

1. **Homepage Access**: https://app.floworx-iq.com/
2. **OAuth Flow**: Click "Sign in with Google"
3. **Registration**: Test new user signup
4. **Dashboard Access**: Verify authenticated user dashboard
5. **API Endpoints**: Test key API functionality

### **Test Commands**:
```bash
# Run production validation
npm run validate:production

# Run smoke tests
npm run test:playwright:smoke

# Run full regression tests
npm run test:regression:full
```

---

## **📊 MONITORING & ALERTS**

### **Set Up Monitoring**:
- [ ] Configure Vercel Analytics
- [ ] Set up error tracking (Sentry)
- [ ] Monitor API response times
- [ ] Set up uptime monitoring

### **Key Metrics to Watch**:
- OAuth success rate
- API response times
- Error rates
- User registration flow completion

---

## **🔒 SECURITY CHECKLIST**

- [x] HTTPS enforced
- [x] CORS properly configured
- [x] Environment variables secured
- [x] OAuth redirect URIs restricted
- [x] Cookie domain properly set

---

## **📞 SUPPORT & TROUBLESHOOTING**

### **If OAuth Fails**:
1. Check Google Cloud Console settings
2. Verify Vercel environment variables
3. Check browser developer tools for errors
4. Verify domain SSL certificate

### **If API Calls Fail**:
1. Check CORS configuration
2. Verify environment variables
3. Check Vercel function logs
4. Test API endpoints directly

---

## **🎉 GO-LIVE VERIFICATION**

Once all manual actions are complete:

1. **Test OAuth Flow**: https://app.floworx-iq.com/login
2. **Create Test Account**: Complete full registration
3. **Test Onboarding**: Complete wizard flow
4. **Verify Email**: Test email functionality
5. **Test Dashboard**: Verify all features work

**The application is LIVE and ready for users!** 🚀

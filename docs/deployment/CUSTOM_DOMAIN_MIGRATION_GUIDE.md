# 🌐 Custom Domain Migration Guide: app.floworx-iq.com

## **🎯 Migration Overview**

**Current State:**
- ✅ Working: `https://floworx-app.vercel.app`
- ❌ Missing: `https://app.floworx-iq.com`

**Target State:**
- ✅ Primary: `https://app.floworx-iq.com`
- ✅ Fallback: `https://floworx-app.vercel.app` (for backup)

---

## **📋 Step-by-Step Migration Process**

### **Step 1: Add Custom Domain to Vercel (5 minutes)**

```bash
# Add the custom domain
vercel domains add app.floworx-iq.com

# Verify domain was added
vercel domains ls
```

### **Step 2: Configure DNS at Domain Provider (10 minutes)**

**At your domain provider (GoDaddy, Namecheap, etc.):**

1. **Go to DNS Management** for `floworx-iq.com`
2. **Add CNAME Record:**
   - **Type**: CNAME
   - **Name**: `app`
   - **Value**: `cname.vercel-dns.com`
   - **TTL**: 300 (5 minutes)

### **Step 3: Update Environment Variables (5 minutes)**

```bash
# Update production environment variables
vercel env add FRONTEND_URL production
# Enter: https://app.floworx-iq.com

vercel env add GOOGLE_REDIRECT_URI production  
# Enter: https://app.floworx-iq.com/api/oauth/google/callback

# Redeploy with new environment variables
vercel --prod
```

### **Step 4: Update Frontend Configuration (2 minutes)**

Update `frontend/.env.production`:
```env
# Production API Configuration for Custom Domain
REACT_APP_API_URL=https://app.floworx-iq.com/api
```

### **Step 5: Update Google Cloud Console (5 minutes)**

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Find your OAuth 2.0 Client ID**
3. **Update Authorized Redirect URIs:**
   - ❌ Remove: `https://floworx-app.vercel.app/api/oauth/google/callback`
   - ✅ Add: `https://app.floworx-iq.com/api/oauth/google/callback`
4. **Save changes**

### **Step 6: Deploy and Test (10 minutes)**

```bash
# Commit configuration changes
git add frontend/.env.production
git commit -m "feat: Migrate to custom domain app.floworx-iq.com"
git push origin main

# Wait for deployment, then test
curl -I https://app.floworx-iq.com
curl https://app.floworx-iq.com/api/health
```

---

## **🧪 Testing Checklist**

### **DNS Propagation Test:**
```bash
# Check DNS resolution
nslookup app.floworx-iq.com

# Should return Vercel's IP addresses
```

### **SSL Certificate Test:**
```bash
# Check SSL certificate
curl -I https://app.floworx-iq.com

# Should return 200 with valid SSL
```

### **Application Functionality Test:**
- [ ] Frontend loads at `https://app.floworx-iq.com`
- [ ] Registration form works (no "endpoint does not exist" error)
- [ ] Login form works
- [ ] Google OAuth redirects correctly
- [ ] API health check responds
- [ ] Database connectivity confirmed

---

## **⚠️ Potential Issues & Solutions**

### **Issue 1: DNS Propagation Delay**
- **Symptom**: Domain doesn't resolve immediately
- **Solution**: Wait 5-30 minutes for DNS propagation
- **Test**: Use `nslookup app.floworx-iq.com`

### **Issue 2: SSL Certificate Provisioning**
- **Symptom**: SSL warnings or certificate errors
- **Solution**: Vercel auto-provisions SSL (wait 5-10 minutes)
- **Test**: Check certificate in browser

### **Issue 3: OAuth Redirect Mismatch**
- **Symptom**: OAuth login fails after domain change
- **Solution**: Update Google Cloud Console redirect URIs
- **Test**: Complete OAuth flow

### **Issue 4: API Calls Fail**
- **Symptom**: Frontend can't reach API
- **Solution**: Update `REACT_APP_API_URL` in frontend config
- **Test**: Check browser network tab

---

## **🔄 Rollback Plan**

If issues occur, quickly rollback:

```bash
# Revert frontend configuration
git revert HEAD
git push origin main

# Revert environment variables
vercel env add FRONTEND_URL production
# Enter: https://floworx-app.vercel.app

vercel env add GOOGLE_REDIRECT_URI production
# Enter: https://floworx-app.vercel.app/api/oauth/google/callback

vercel --prod
```

---

## **📊 Migration Timeline**

| Step | Duration | Status |
|------|----------|--------|
| Add domain to Vercel | 5 min | ⏳ Pending |
| Configure DNS | 10 min | ⏳ Pending |
| Update environment variables | 5 min | ⏳ Pending |
| Update frontend config | 2 min | ⏳ Pending |
| Update Google OAuth | 5 min | ⏳ Pending |
| Deploy and test | 10 min | ⏳ Pending |
| **Total** | **37 min** | ⏳ Pending |

---

## **🎯 Success Criteria**

✅ **Primary Domain Active**: `https://app.floworx-iq.com` loads successfully  
✅ **API Connectivity**: All API endpoints respond correctly  
✅ **OAuth Integration**: Google login works with new domain  
✅ **SSL Security**: Valid SSL certificate installed  
✅ **User Experience**: No "endpoint does not exist" errors  
✅ **Fallback Working**: `https://floworx-app.vercel.app` still accessible  

---

**🚀 Ready to proceed with custom domain migration?**

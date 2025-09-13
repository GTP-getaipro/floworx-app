# 🧪 Comprehensive Testing Checklist for Floworx SaaS

## 🎯 **Testing Order & Priority**

### **Phase 1: Core Infrastructure (CRITICAL)**
- [ ] **Homepage Loading** - https://app.floworx-iq.com/
- [ ] **Health Checks** - API endpoints working
- [ ] **Static Assets** - CSS, JS, images loading
- [ ] **Console Errors** - No JavaScript errors

### **Phase 2: Authentication System (HIGH PRIORITY)**
- [ ] **User Registration** - New account creation
- [ ] **Email Verification** - If implemented
- [ ] **User Login** - Existing account access
- [ ] **Password Reset** - Recovery functionality
- [ ] **Session Management** - Login persistence
- [ ] **Logout** - Proper session termination

### **Phase 3: OAuth Integration (HIGH PRIORITY)**
- [ ] **Google OAuth** - Authorization flow
- [ ] **OAuth Callback** - Redirect handling
- [ ] **Account Linking** - Connect Google account
- [ ] **OAuth Token Storage** - Encrypted storage
- [ ] **OAuth Refresh** - Token renewal

### **Phase 4: Dashboard & User Interface (MEDIUM PRIORITY)**
- [ ] **Dashboard Access** - Post-login redirect
- [ ] **User Profile** - Account information display
- [ ] **Navigation** - Menu and routing
- [ ] **Responsive Design** - Mobile compatibility
- [ ] **Loading States** - User feedback

### **Phase 5: Business Logic (MEDIUM PRIORITY)**
- [ ] **Business Type Selection** - Onboarding step
- [ ] **Configuration Setup** - Business settings
- [ ] **Gmail Integration** - Email processing setup
- [ ] **Workflow Templates** - Available templates
- [ ] **Team Notifications** - Notification settings

### **Phase 6: Advanced Features (LOW PRIORITY)**
- [ ] **n8n Integration** - Workflow deployment
- [ ] **Real-time Updates** - Live data sync
- [ ] **Analytics** - Usage tracking
- [ ] **Performance** - Page load times
- [ ] **Security** - Data protection

## 🔍 **Detailed Testing Instructions**

### **1. Homepage & Infrastructure Testing**

**Test 1.1: Homepage Loading**
1. Open https://app.floworx-iq.com/
2. Check: Page loads within 3 seconds
3. Check: No broken images or missing CSS
4. Check: Navigation menu visible and functional

**Test 1.2: Health Check APIs**
1. Open https://app.floworx-iq.com/api/health
2. Expected: `{"status":"ok","timestamp":"...","uptime":...}`
3. Open https://app.floworx-iq.com/api/health/database
4. Expected: `{"status":"healthy","method":"Supabase REST API",...}`

**Test 1.3: Console Errors**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Refresh the page
4. Check: No red error messages

### **2. Authentication System Testing**

**Test 2.1: User Registration**
1. Navigate to registration page
2. Fill out registration form with test data:
   - Email: test+[timestamp]@example.com
   - Password: TestPassword123!
   - First Name: Test
   - Last Name: User
3. Submit form
4. Check: Success message or redirect to dashboard
5. Check: User created in database

**Test 2.2: User Login**
1. Navigate to login page
2. Use credentials from registration test
3. Submit login form
4. Check: Redirect to dashboard
5. Check: User session established

**Test 2.3: Password Reset**
1. Navigate to password reset page
2. Enter registered email address
3. Submit form
4. Check: Success message displayed
5. Check: Reset email sent (if email configured)

### **3. OAuth Integration Testing**

**Test 3.1: Google OAuth Flow**
1. Click "Sign in with Google" button
2. Check: Redirect to Google OAuth page
3. Authorize the application
4. Check: Redirect back to your app
5. Check: User logged in successfully

**Test 3.2: OAuth Callback**
1. Monitor network tab during OAuth flow
2. Check: Callback URL receives authorization code
3. Check: Access token obtained and stored
4. Check: User account created/linked

### **4. Dashboard & UI Testing**

**Test 4.1: Dashboard Access**
1. Login to application
2. Check: Dashboard loads successfully
3. Check: User information displayed
4. Check: Navigation menu functional

**Test 4.2: Responsive Design**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Check: Layout adapts properly
5. Check: All features accessible

### **5. Business Logic Testing**

**Test 5.1: Onboarding Flow**
1. Complete registration/login
2. Start onboarding process
3. Select business type
4. Configure business settings
5. Complete all onboarding steps
6. Check: Workflow deployed successfully

## 🚨 **Common Issues to Watch For**

### **Frontend Issues:**
- [ ] CORS errors in console
- [ ] 404 errors for API endpoints
- [ ] JavaScript bundle loading failures
- [ ] CSS styling issues

### **Backend Issues:**
- [ ] 500 Internal Server errors
- [ ] Database connection failures
- [ ] Authentication token issues
- [ ] OAuth configuration problems

### **Integration Issues:**
- [ ] Google OAuth misconfiguration
- [ ] Email service not working
- [ ] n8n API connection failures
- [ ] Environment variable missing

## 📊 **Testing Results Template**

For each test, record:
- ✅ **PASS** - Feature works as expected
- ❌ **FAIL** - Feature broken, needs fixing
- ⚠️ **PARTIAL** - Feature partially working
- 🔄 **SKIP** - Test not applicable/dependencies missing

## 🎯 **Priority Fix Order**

If issues are found:
1. **Critical:** Homepage not loading, database errors
2. **High:** Authentication broken, OAuth not working
3. **Medium:** UI issues, missing features
4. **Low:** Performance optimizations, minor bugs

## 📝 **Bug Report Format**

For any failures, provide:
- **URL:** Where the issue occurred
- **Steps:** How to reproduce
- **Expected:** What should happen
- **Actual:** What actually happened
- **Console:** Any error messages
- **Screenshot:** Visual evidence if applicable

## 🚀 **Success Criteria**

Application is considered fully functional when:
- ✅ All Phase 1 & 2 tests pass (Critical & High Priority)
- ✅ At least 80% of Phase 3 & 4 tests pass
- ✅ No critical console errors
- ✅ Core user journey works end-to-end

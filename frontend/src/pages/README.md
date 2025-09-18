# FloWorx Pages - Component Structure Guardrails

## 🔑 **GUARDRAIL: Single Source of Truth**

**⚠️ CRITICAL RULE: One component per feature. No duplicates allowed.**

This directory contains the **ONLY** page components for FloWorx. Any duplicate components in other locations must be removed immediately.

---

## 📋 **Canonical Page Components**

### **✅ AUTHENTICATION PAGES (Use These Only)**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **ForgotPasswordPage.jsx** | `frontend/src/pages/ForgotPasswordPage.jsx` | Password reset request form | ✅ **CANONICAL** |
| **ResetPasswordPage.jsx** | `frontend/src/pages/ResetPasswordPage.jsx` | Password reset completion form | ✅ **CANONICAL** |
| **LoginPage.jsx** | `frontend/src/pages/LoginPage.jsx` | User login form | ✅ **CANONICAL** |
| **RegisterPage.jsx** | `frontend/src/pages/RegisterPage.jsx` | User registration form | ✅ **CANONICAL** |
| **VerifyEmailPage.jsx** | `frontend/src/pages/VerifyEmailPage.jsx` | Email verification handling | ✅ **CANONICAL** |
| **CheckEmailPage.jsx** | `frontend/src/pages/CheckEmailPage.jsx` | Email check instructions | ✅ **CANONICAL** |

### **✅ ONBOARDING PAGES**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **Step1Business.jsx** | `frontend/src/pages/onboarding/Step1Business.jsx` | Business information collection | ✅ **CANONICAL** |
| **Step2Email.jsx** | `frontend/src/pages/onboarding/Step2Email.jsx` | Email service selection | ✅ **CANONICAL** |
| **Step2Gmail.jsx** | `frontend/src/pages/onboarding/Step2Gmail.jsx` | Gmail OAuth integration | ✅ **CANONICAL** |
| **Step3Labels.jsx** | `frontend/src/pages/onboarding/Step3Labels.jsx` | Email label configuration | ✅ **CANONICAL** |
| **Step4Team.jsx** | `frontend/src/pages/onboarding/Step4Team.jsx` | Team member setup | ✅ **CANONICAL** |
| **Complete.jsx** | `frontend/src/pages/onboarding/Complete.jsx` | Onboarding completion | ✅ **CANONICAL** |

### **✅ OAUTH PAGES**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **MicrosoftCallback.jsx** | `frontend/src/pages/oauth/MicrosoftCallback.jsx` | Microsoft OAuth callback | ✅ **CANONICAL** |

### **❌ FORBIDDEN LOCATIONS (Never Create Components Here)**

- ❌ `frontend/src/pages/Auth/` (removed - was causing duplicates)
- ❌ `frontend/src/components/Login.js` (legacy - use LoginPage.jsx)
- ❌ `frontend/src/components/Register.js` (legacy - use RegisterPage.jsx)
- ❌ `frontend/src/components/auth/` (use for UI components only, not pages)

---

## 🎨 **FloWorx Design System Requirements**

### **Required Imports for All Auth Pages**
```jsx
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/auth/Input";
import PasswordInput from "../components/auth/PasswordInput";
import Button from "../components/auth/Button";
import useFormValidation from "../hooks/useFormValidation";
```

### **Styling Standards**
- **✅ USE**: Tailwind CSS classes only
- **✅ USE**: FloWorx blue theme (`--shadow-blue-focus`)
- **✅ USE**: Glass morphism effects for cards
- **❌ NEVER**: Material-UI (@mui/*)
- **❌ NEVER**: Bootstrap classes
- **❌ NEVER**: Inline styles (except for dynamic values)

### **Form Security Requirements**
```jsx
// ✅ REQUIRED: All form fields must start empty
const [formData, setFormData] = useState({
  email: '', // ✅ Always empty string
  password: '' // ✅ Always empty string
});

// ❌ FORBIDDEN: Pre-filled values
const [formData, setFormData] = useState({
  email: user?.email || '', // ❌ Security risk
  password: defaultPassword // ❌ Security risk
});
```

---

## 🔒 **Security Guardrails**

### **1. Email Pre-filling Prevention**
```jsx
// ✅ REQUIRED: Clear all storage on mount
useEffect(() => {
  // Clear all potential email storage
  localStorage.removeItem('email');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('rememberedEmail');
  sessionStorage.removeItem('email');
  sessionStorage.removeItem('userEmail');
  
  // Prevent browser autofill
  const emailInput = document.querySelector('input[type="email"]');
  if (emailInput) {
    emailInput.setAttribute('autocomplete', 'off');
    emailInput.setAttribute('data-lpignore', 'true');
  }
}, []);
```

### **2. Token Validation**
```jsx
// ✅ REQUIRED: Use centralized token TTL
const { authConfig } = require('../../../backend/config/authConfig');
const tokenExpiry = authConfig.tokens.passwordResetTTL; // 15 minutes
```

---

## 🧪 **Testing Requirements**

### **Required Test Coverage**
Each page component MUST have tests for:

1. **Rendering**: Component renders without errors
2. **Form Validation**: All validation rules work correctly  
3. **Security**: Email fields start empty and stay secure
4. **Error Handling**: Proper error display and codes
5. **Success Flow**: Successful form submission handling

### **Test File Naming Convention**
```
frontend/src/pages/__tests__/[ComponentName].test.jsx
```

---

## 🚨 **CI/CD Enforcement**

### **Automated Checks**
The CI pipeline automatically enforces these rules:

1. **Component Uniqueness**: `knip` detects duplicate components
2. **Import Validation**: ESLint blocks @mui/* and bootstrap/* imports
3. **Security Validation**: Tests verify email fields start empty
4. **Token Consistency**: Tests verify 15-minute token expiry

### **Build Failure Triggers**
The build will FAIL if:
- ❌ Duplicate page components are detected
- ❌ External design libraries are imported
- ❌ Email pre-filling is detected
- ❌ Token TTL mismatches are found

---

## 📝 **Adding New Page Components**

### **Before Creating Any New Component:**

1. **Check this README** - Is there already a canonical component?
2. **Update this documentation** - Add the new component to the approved list
3. **Follow naming convention** - Use `[Feature]Page.jsx` format
4. **Implement all security requirements** - Email clearing, validation, etc.
5. **Add comprehensive tests** - Cover all required test scenarios
6. **Update CI configuration** - Add component to knip whitelist if needed

### **Component Creation Checklist**
- [ ] Component follows `[Feature]Page.jsx` naming convention
- [ ] Uses only approved FloWorx design system components
- [ ] Implements email pre-filling prevention (for auth pages)
- [ ] Uses centralized authConfig for token TTLs (for auth pages)
- [ ] Has comprehensive test coverage
- [ ] Updated this README with component details
- [ ] Passes all CI/CD checks

---

**🛡️ Remember: This guardrail system prevents the component drift issues that caused production outages. Maintain it religiously.**

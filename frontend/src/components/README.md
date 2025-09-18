# FloWorx Components - Design System Guardrails

## 🎨 **GUARDRAIL: FloWorx Design System Only**

**⚠️ CRITICAL RULE: Only Tailwind CSS + FloWorx design system components allowed.**

This directory contains reusable UI components that follow the FloWorx design system. External design libraries are strictly forbidden.

---

## 📋 **Approved Component Categories**

### **✅ AUTH COMPONENTS (UI Only)**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **AuthLayout** | `frontend/src/components/auth/AuthLayout.jsx` | Authentication page layout | ✅ **CANONICAL** |
| **Input** | `frontend/src/components/auth/Input.jsx` | Form input field | ✅ **CANONICAL** |
| **PasswordInput** | `frontend/src/components/auth/PasswordInput.jsx` | Password input with visibility toggle | ✅ **CANONICAL** |
| **Button** | `frontend/src/components/auth/Button.jsx` | Form submit button | ✅ **CANONICAL** |

### **✅ UI COMPONENTS**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **ValidatedInput** | `frontend/src/components/ui/ValidatedInput.jsx` | Input with validation display | ✅ **CANONICAL** |
| **ProtectedButton** | `frontend/src/components/ui/ProtectedButton.jsx` | Button with loading states | ✅ **CANONICAL** |
| **ProgressIndicator** | `frontend/src/components/ui/ProgressIndicator.jsx` | Progress display component | ✅ **CANONICAL** |
| **Logo** | `frontend/src/components/ui/Logo.jsx` | FloWorx logo component | ✅ **CANONICAL** |

### **✅ BUSINESS COMPONENTS**

| **Component** | **Path** | **Purpose** | **Status** |
|---------------|----------|-------------|------------|
| **Dashboard** | `frontend/src/components/Dashboard.jsx` | Main dashboard view | ✅ **CANONICAL** |
| **OnboardingWizard** | `frontend/src/components/OnboardingWizard.jsx` | Multi-step onboarding | ✅ **CANONICAL** |
| **Settings** | `frontend/src/components/Settings.jsx` | User settings interface | ✅ **CANONICAL** |

---

## 🚫 **FORBIDDEN IMPORTS**

### **❌ NEVER IMPORT THESE LIBRARIES**

```jsx
// ❌ FORBIDDEN: Material-UI
import { Button } from '@mui/material';
import Button from '@mui/material/Button';
import * as mui from '@mui/material';

// ❌ FORBIDDEN: Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button } from 'react-bootstrap';

// ❌ FORBIDDEN: Ant Design
import { Button } from 'antd';

// ❌ FORBIDDEN: Chakra UI
import { Button } from '@chakra-ui/react';

// ❌ FORBIDDEN: Semantic UI
import { Button } from 'semantic-ui-react';
```

### **✅ APPROVED IMPORTS ONLY**

```jsx
// ✅ APPROVED: Tailwind CSS (via className)
<div className="bg-blue-500 text-white p-4 rounded-lg">

// ✅ APPROVED: FloWorx design system components
import AuthLayout from "../auth/AuthLayout";
import Input from "../auth/Input";
import Button from "../auth/Button";

// ✅ APPROVED: React and standard libraries
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ APPROVED: Utility libraries
import { api } from '../../lib/api';
import useFormValidation from '../../hooks/useFormValidation';
```

---

## 🎨 **FloWorx Design System Standards**

### **Color Palette**
```css
/* Primary Colors */
--floworx-blue: #3B82F6;
--floworx-blue-dark: #1E40AF;
--floworx-blue-light: #93C5FD;

/* Accent Colors */
--floworx-green: #10B981;
--floworx-red: #EF4444;
--floworx-yellow: #F59E0B;

/* Neutral Colors */
--floworx-gray-50: #F9FAFB;
--floworx-gray-100: #F3F4F6;
--floworx-gray-900: #111827;
```

### **Typography Scale**
```css
/* Headings */
.text-4xl { font-size: 2.25rem; } /* Main titles */
.text-3xl { font-size: 1.875rem; } /* Section titles */
.text-2xl { font-size: 1.5rem; } /* Subsection titles */
.text-xl { font-size: 1.25rem; } /* Card titles */

/* Body Text */
.text-base { font-size: 1rem; } /* Default body text */
.text-sm { font-size: 0.875rem; } /* Small text */
.text-xs { font-size: 0.75rem; } /* Captions */
```

### **Spacing System**
```css
/* Padding/Margin Scale */
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
```

### **Component Patterns**

#### **Form Components**
```jsx
// ✅ STANDARD: Form input pattern
<div className="space-y-4">
  <Input
    type="email"
    name="email"
    placeholder="Enter your email"
    value={formData.email}
    onChange={handleInputChange}
    error={errors.email}
    className="w-full"
  />
</div>
```

#### **Button Components**
```jsx
// ✅ STANDARD: Button patterns
<Button
  type="submit"
  variant="primary"
  size="lg"
  loading={isSubmitting}
  className="w-full"
>
  Sign In
</Button>
```

#### **Card Components**
```jsx
// ✅ STANDARD: Card pattern with glass morphism
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg">
  <h2 className="text-xl font-semibold text-white mb-4">Card Title</h2>
  <p className="text-white/80">Card content</p>
</div>
```

---

## 🔒 **Security Requirements**

### **Form Components Must:**

1. **Prevent Pre-filling**: Never pre-populate sensitive fields
2. **Validate Input**: Use proper validation rules
3. **Handle Errors**: Display user-friendly error messages
4. **Clear State**: Clean up on unmount

```jsx
// ✅ REQUIRED: Security-compliant form component
const SecureFormComponent = () => {
  const [formData, setFormData] = useState({
    email: '', // ✅ Always start empty
    password: '' // ✅ Always start empty
  });

  useEffect(() => {
    // ✅ Clear any stored values
    localStorage.removeItem('email');
    sessionStorage.removeItem('email');
  }, []);

  // ✅ Proper cleanup
  useEffect(() => {
    return () => {
      setFormData({ email: '', password: '' });
    };
  }, []);
};
```

---

## 🧪 **Testing Requirements**

### **All Components Must Have:**

1. **Render Tests**: Component renders without errors
2. **Props Tests**: All props work correctly
3. **Interaction Tests**: User interactions work as expected
4. **Accessibility Tests**: ARIA labels and keyboard navigation
5. **Security Tests**: No pre-filling, proper validation

### **Test File Structure**
```
frontend/src/components/__tests__/[ComponentName].test.jsx
```

### **Example Test Pattern**
```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  test('renders without errors', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('handles user interaction', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onClick={mockHandler} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

---

## 🚨 **CI/CD Enforcement**

### **ESLint Rules**
The following ESLint rules automatically prevent external design library usage:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          "@mui/*",
          "bootstrap*",
          "antd*",
          "@chakra-ui/*",
          "semantic-ui-react*"
        ]
      }
    ]
  }
}
```

### **Build Failure Triggers**
The build will FAIL if:
- ❌ External design libraries are imported
- ❌ Components don't follow naming conventions
- ❌ Security requirements are not met
- ❌ Tests don't pass

---

## 📝 **Creating New Components**

### **Component Creation Checklist**
- [ ] Component follows PascalCase naming convention
- [ ] Uses only Tailwind CSS for styling
- [ ] Implements FloWorx design system patterns
- [ ] Includes proper TypeScript/PropTypes definitions
- [ ] Has comprehensive test coverage
- [ ] Follows security requirements (for form components)
- [ ] Updated this README with component details
- [ ] Passes all CI/CD checks

### **Component Template**
```jsx
import React from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'base-component-classes';
  const variantClasses = {
    default: 'default-variant-classes',
    primary: 'primary-variant-classes'
  };
  const sizeClasses = {
    sm: 'small-size-classes',
    md: 'medium-size-classes',
    lg: 'large-size-classes'
  };

  const combinedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <div className={combinedClasses} {...props}>
      {children}
    </div>
  );
};

ComponentName.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'primary']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string
};

export default ComponentName;
```

---

**🛡️ Remember: The FloWorx design system ensures consistent, professional UI across the entire application. External libraries break this consistency and are strictly forbidden.**

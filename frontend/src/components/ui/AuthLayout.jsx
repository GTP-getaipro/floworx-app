import React from "react";
import "../../styles/auth.css";
import Logo from "./Logo";

/**
 * AuthLayout - Authentication Pages Layout Component (UI Version)
 *
 * Alternative authentication layout component with different styling
 * and branding approach for specific auth pages.
 *
 * @component
 * @example
 * // Basic usage
 * <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
 *   <LoginForm />
 * </AuthLayout>
 *
 * // Without subtitle
 * <AuthLayout title="Create Account">
 *   <RegisterForm />
 * </AuthLayout>
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Main heading text for the auth page
 * @param {string} [props.subtitle] - Subtitle text below the main heading
 * @param {React.ReactNode} props.children - Auth form or content to display
 *
 * @features
 * - Dual logo display (brand header + card logo)
 * - Responsive design with mobile optimization
 * - Consistent auth page styling via CSS imports
 * - Flexible content area for any auth form
 * - Professional branding with FloWorx logos
 * - Card-based layout for focused user experience
 *
 * @dependencies
 * - Logo: FloWorx branding component with multiple variants
 * - CSS: auth.css for styling and responsive behavior
 *
 * @note This is an alternative to components/auth/AuthLayout.jsx
 */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-root">
      <div className="brand">
        <div className="brand-content">
          <Logo variant="blue-on-white" size="sm" showText={true} />
        </div>
      </div>
      <div className="auth-wrap">
        <div className="card">
          <div className="auth-card-header">
            <Logo variant="icon" size="md" className="auth-card-logo" />
            {title && <h1 className="h1">{title}</h1>}
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

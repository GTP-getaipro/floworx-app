import React, { useState, useEffect } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import FormContainer, { FormInput, FormButton, FormAlert, FormNavigation, FormLink } from "../components/auth/FormContainer";
import useFormValidation from "../hooks/useFormValidation";
import { required, email, minLength } from "../utils/validationRules";
import { api } from "../lib/api";
import { handleReturnToFromQuery, getReturnTo, clearReturnTo } from "../lib/returnTo";
import { useAuth } from "../contexts/AuthContext";

/**
 * LoginPage - User Authentication Page
 *
 * Handles user login with form validation, error handling, and email verification.
 * Supports both prop-based and context-based usage patterns for flexibility.
 *
 * @component
 * @param {Object} props - Component props (optional for backward compatibility)
 * @param {Object} props.errors - Initial error state (optional)
 * @param {Object} props.values - Initial form values (optional)
 * @param {Object} props.links - Navigation links (optional)
 *
 * @example
 * // Primary usage with AuthContext (recommended)
 * <LoginPage />
 *
 * // Legacy usage with props (backward compatibility)
 * <LoginPage errors={errors} values={values} links={links} />
 *
 * @features
 * - Uses AuthContext for authentication
 * - Form validation with real-time feedback
 * - Email verification handling
 * - Return URL support
 * - Loading states and error handling
 *
 * @dependencies
 * - AuthContext: Must be wrapped in AuthProvider
 * - React Router: Uses useNavigate and useSearchParams
 */
export default function LoginPage({ errors = {}, values = {}, links = {} }) {
  const { login } = useAuth();
  const [showUnverifiedBanner, setShowUnverifiedBanner] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    values: formValues,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid
  } = useFormValidation({
    initialValues: { email: values.email || "", password: values.password || "" },
    rules: {
      email: [required(), email()],
      password: [required(), minLength(8)]
    }
  });

  // Handle returnTo from query params on mount
  useEffect(() => {
    handleReturnToFromQuery(searchParams);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (!valid) return;

    // Reset states
    setShowUnverifiedBanner(false);
    setResendSuccess(false);
    setLoading(true);
    setSubmitError(null);

    try {
      const result = await login(formValues.email, formValues.password);

      if (result.success) {
        // On successful login, redirect to returnTo or default
        const returnTo = getReturnTo();
        clearReturnTo();
        navigate(returnTo || '/dashboard');
      } else {
        // Check if it's an email verification error
        if (result.code === 'EMAIL_NOT_VERIFIED') {
          setShowUnverifiedBanner(true);
        } else {
          setSubmitError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      setSubmitError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      await api('/api/auth/resend', {
        method: 'POST',
        body: { email: formValues.email }
      });
      setResendSuccess(true);
    } catch (error) {
      // Don't show errors for resend to avoid revealing user existence
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout title="Sign in to FloWorx" subtitle="Access your automation dashboard">
      {showUnverifiedBanner && (
        <FormAlert type="warning" className="mb-4">
          <div className="text-sm">
            Please verify your email to continue.
          </div>
          {resendSuccess ? (
            <div className="mt-2 text-green-100 text-sm">
              Verification email sent! Check your inbox.
            </div>
          ) : (
            <FormLink
              onClick={handleResendVerification}
              className="mt-2 block"
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </FormLink>
          )}
        </FormAlert>
      )}

      {submitError && (
        <FormAlert type="error">
          {submitError}
        </FormAlert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          name="email"
          type="email"
          label="Email Address"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          touched={touched.email}
          autoFocus={true}
          required={true}
          placeholder="you@company.com"
          disabled={loading}
        />

        <FormInput
          name="password"
          type="password"
          label="Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          touched={touched.password}
          required={true}
          placeholder="••••••••"
          disabled={loading}
        />

        <FormButton
          type="submit"
          disabled={loading || (!isValid && Object.keys(touched).length > 0)}
          loading={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </FormButton>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-sm">
          <FormLink onClick={() => window.location.href = links.forgotPassword || "/forgot-password"}>
            Forgot your password?
          </FormLink>
          <FormLink onClick={() => window.location.href = links.register || "/register"}>
            Create an account
          </FormLink>
        </div>
      </form>
    </AuthLayout>
  );
}

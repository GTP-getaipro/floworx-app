import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import FormContainer, { FormInput, FormButton, FormAlert, FormNavigation, FormLink } from "../components/auth/FormContainer";
import useFormValidation from "../hooks/useFormValidation";
import { required, email, minLength } from "../utils/validationRules";
import { api } from "../lib/api";
import { handleReturnToFromQuery, getReturnTo, clearReturnTo } from "../lib/returnTo";

export default function LoginPage({ onSubmit, errors = {}, values = {}, links = {} }) {
  const [showUnverifiedBanner, setShowUnverifiedBanner] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
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

    // Call original onSubmit if provided (for compatibility)
    if (onSubmit) {
      try {
        await onSubmit(formValues);

        // On successful login, redirect to returnTo or default
        const returnTo = getReturnTo();
        clearReturnTo();
        navigate(returnTo || '/');
      } catch (error) {
        // Check if it's a 409 UNVERIFIED error
        if (error?.status === 409 && error?.code === 'UNVERIFIED') {
          setShowUnverifiedBanner(true);
        }
      }
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
        />

        <FormButton
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Sign In
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

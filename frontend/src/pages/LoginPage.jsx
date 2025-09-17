import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/auth/Input";
import PasswordInput from "../components/auth/PasswordInput";
import Button from "../components/auth/Button";
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
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div
            className="text-yellow-800 text-sm"
            role="alert"
            aria-live="polite"
          >
            Please verify your email to continue.
          </div>
          {resendSuccess ? (
            <div className="mt-2 text-green-700 text-sm">
              Verification email sent! Check your inbox.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="mt-2 text-yellow-700 hover:text-yellow-900 underline text-sm"
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          placeholder="you@company.com"
        />
        <PasswordInput
          id="password"
          name="password"
          label="Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password || errors.password}
          placeholder="••••••••"
        />
        <Button
          type="submit"
          disabled={!isValid && Object.keys(touched).length > 0}
        >
          Sign In
        </Button>
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
          <a
            href={links.forgotPassword || "/forgot-password"}
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Forgot your password?
          </a>
          <a
            href={links.register || "/register"}
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Create an account
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}

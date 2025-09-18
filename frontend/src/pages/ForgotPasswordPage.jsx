import React, { useEffect, useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/auth/Input";
import Button from "../components/auth/Button";
import useFormValidation from "../hooks/useFormValidation";
import { required, email } from "../utils/validationRules";
import { api } from "../lib/api";

export default function ForgotPasswordPage({ onSubmit, errors = {}, values = {} }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [networkError, setNetworkError] = useState('');

  const {
    values: formValues,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid
  } = useFormValidation({
    initialValues: { email: "" }, // Always start with empty email for security
    rules: {
      email: [required(), email()]
    }
  });

  // Clear any existing form persistence data on component mount for security
  useEffect(() => {
    try {
      // Clear any previously stored email data
      window.localStorage.removeItem('floworx:auth:forgot');
      window.sessionStorage.removeItem('floworx:auth:forgot');
    } catch (error) {
      console.warn('Failed to clear persisted form data:', error);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (!valid) return;

    setIsLoading(true);
    setNetworkError('');

    try {
      await api('/api/auth/password/request', {
        method: 'POST',
        body: { email: formValues.email }
      });

      // Clear any form data from storage after successful submission for security
      try {
        window.localStorage.removeItem('floworx:auth:forgot');
        window.sessionStorage.removeItem('floworx:auth:forgot');
      } catch (error) {
        console.warn('Failed to clear form data after submission:', error);
      }

      setIsSuccess(true);
    } catch (error) {
      // Only show network errors, not user existence errors (security)
      if (error.status === 0 || error.code === 'NETWORK_ERROR') {
        setNetworkError('Network error. Please check your connection and try again.');
      } else {
        // For all other errors, still show success (security - don't reveal user existence)
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }

    // Call original onSubmit if provided (for compatibility)
    if (onSubmit) {
      onSubmit(formValues);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a password reset link">
        <div className="text-center space-y-4">
          <div
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
            role="status"
            aria-live="polite"
          >
            If an account exists with that email address, we've sent you a link to reset your password.
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a
              href="/login"
              className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
            >
              Back to login
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {networkError && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
            role="alert"
            aria-live="assertive"
          >
            {networkError}
          </div>
        )}
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          value={formValues.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.email || errors.email}
          placeholder="Enter your account email"
          aria-invalid={!!(formErrors.email || errors.email)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <Button
          type="submit"
          disabled={isLoading || (!isValid && Object.keys(touched).length > 0)}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
          <a
            href="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Back to login
          </a>
          <a
            href="/register"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Create account
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}

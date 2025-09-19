import React, { useEffect, useState } from "react";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/auth/Input";
import Button from "../components/auth/Button";
import useFormValidation from "../hooks/useFormValidation";
import { required, email } from "../utils/validationRules";
import { api } from "../lib/api";

export default function ForgotPasswordPage() {
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
      // Clear any previously stored email data from all possible sources
      const keysToRemove = [
        'floworx:auth:forgot',
        'floworx:auth:email',
        'floworx:registration',
        'floworx:login',
        'email',
        'userEmail',
        'lastEmail',
        'auth:email',
        'forgot:email'
      ];

      // Clear from both localStorage and sessionStorage
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });

      // Clear any form autofill data and disable autocomplete
      setTimeout(() => {
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
          input.value = '';
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-form-type', 'other');
        });
      }, 100);
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
      await api('/api/auth/forgot-password', {
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
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent you a password reset link">
        <div className="text-center space-y-4">
          <div
            className="p-4 bg-green-500/20 border border-green-400/30 rounded-xl text-green-100 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Email sent successfully</span>
            </div>
            <p className="text-sm text-green-200">
              If an account exists with that email address, we've sent you a link to reset your password.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <a
              href="/login"
              className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center transition-colors duration-200"
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
            className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-100 backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-300 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{networkError}</span>
            </div>
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
          error={formErrors.email}
          placeholder="Enter your account email"
          aria-invalid={!!formErrors.email}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          data-lpignore="true"
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

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import Button from "../components/auth/Button";
import useFormValidation from "../hooks/useFormValidation";
import { required, minLength, passwordStrong, matches } from "../utils/validationRules";
import { api } from "../lib/api";
import { handleReturnToFromQuery } from "../lib/returnTo";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    values: formValues,
    errors: formErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid
  } = useFormValidation({
    initialValues: { password: '', confirm: '' },
    rules: {
      password: [required(), minLength(8), passwordStrong()],
      confirm: [required(), matches('password')]
    }
  });

  useEffect(() => {
    // Handle returnTo from query params on mount
    handleReturnToFromQuery(searchParams);

    if (!token) {
      navigate('/forgot-password');
    }
  }, [token, navigate, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (!valid) return;

    setIsLoading(true);
    setApiError('');

    try {
      await api('/api/password-reset/reset', {
        method: 'POST',
        body: { token, password: formValues.password }
      });
      setIsSuccess(true);

      // Reset success always routes to /login?reset=1 (ignores returnTo)
      setTimeout(() => navigate('/login?reset=1'), 2000);
    } catch (error) {
      // Map specific error codes to user-friendly messages
      if (error.code === 'TOKEN_INVALID') {
        setApiError('Password reset link invalid or expired');
      } else if (error.code === 'PASSWORD_MISMATCH') {
        setApiError('Passwords do not match');
      } else if (error.code === 'WEAK_PASSWORD') {
        // Show validator message under field - this will be handled by form validation
        setApiError('');
      } else {
        setApiError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been successfully changed">
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
              <span className="font-medium">Password updated successfully</span>
            </div>
            <p className="text-sm text-green-200">
              Your password has been changed. You can now sign in with your new password.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <a
              href="/login"
              className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
            >
              Continue to sign in
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {apiError && (
          <div
            className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-100 backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-300 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{apiError}</span>
            </div>
          </div>
        )}
        <PasswordInput
          id="password"
          name="password"
          label="New Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password}
          placeholder="Create a new password"
          aria-invalid={!!formErrors.password}
        />
        <PasswordInput
          id="confirm"
          name="confirm"
          label="Confirm New Password"
          value={formValues.confirm}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.confirm}
          placeholder="Confirm your new password"
          aria-invalid={!!formErrors.confirm}
        />
        <Button
          type="submit"
          disabled={isLoading || (!isValid && Object.keys(touched).length > 0)}
        >
          {isLoading ? 'Updating Password...' : 'Update Password'}
        </Button>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <a
            href="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Back to sign in
          </a>
        </div>
      </form>
    </AuthLayout>
  );
}

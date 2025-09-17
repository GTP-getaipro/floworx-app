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
      await api('/api/auth/password/reset', {
        method: 'POST',
        body: { token, password: formValues.password }
      });
      setIsSuccess(true);

      // Reset success always routes to /login?reset=1 (ignores returnTo)
      setTimeout(() => navigate('/login?reset=1'), 2000);
    } catch (error) {
      // Map specific error codes to user-friendly messages
      if (error.code === 'INVALID_TOKEN') {
        setApiError('That link is invalid.');
      } else if (error.code === 'TOKEN_EXPIRED') {
        setApiError('That link has expired. Request a new reset email.');
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
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
            role="status"
            aria-live="polite"
          >
            Password updated. Please sign in.
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
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
            role="alert"
            aria-live="assertive"
          >
            {apiError}
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

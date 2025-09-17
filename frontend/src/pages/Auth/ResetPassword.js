import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { api } from '../../lib/api';
import PasswordInput from '../../components/auth/PasswordInput';
import Button from '../../components/auth/Button';
import useFormValidation from '../../hooks/useFormValidation';
import { required, minLength, passwordStrong, matches } from '../../utils/validationRules';

const ResetPassword = () => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

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
    if (!token) {
      navigate('/forgot-password');
      return;
    }

    // Verify token validity
    const verifyToken = async () => {
      try {
        await api('/api/auth/verify-reset-token', {
          method: 'POST',
          body: { token }
        });
        setIsValidToken(true);
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidToken(false);
        setErrors({ token: error.message || 'Invalid or expired reset token' });
      }
    };

    verifyToken();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { valid } = validate();
    if (!valid) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          password: formValues.password
        }
      });

      setIsSuccess(true);
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ submit: error.message || 'Failed to reset password. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidToken === null) {
    return (
      <AuthLayout title="Verifying reset token..." subtitle="Please wait while we verify your reset token...">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </AuthLayout>
    );
  }

  if (isValidToken === false) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is invalid or has expired"
      >
        <div className="bg-red-50/20 border border-red-300/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {errors.token || 'This password reset link is no longer valid.'}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/forgot-password"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Request a new reset link
          </Link>
          <Link
            to="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password reset successful"
        subtitle="Your password has been updated"
      >
        <div className="bg-green-50/20 border border-green-300/30 rounded-xl p-4 mb-6 text-green-400 text-sm">
          Your password has been successfully reset. You can now sign in with your new password.
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm"
          >
            Sign in to your account
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter your new password below"
    >
      {errors.submit && (
        <div className="bg-red-50/20 border border-red-300/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          id="password"
          name="password"
          label="New Password"
          value={formValues.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={formErrors.password}
          placeholder="Create a new password"
          disabled={isSubmitting}
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
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          disabled={isSubmitting || (!isValid && Object.keys(touched).length > 0)}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Updating Password...' : 'Update Password'}
        </Button>
      </form>

      <div className="text-center pt-4">
        <Link
          to="/login"
          className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm"
        >
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;

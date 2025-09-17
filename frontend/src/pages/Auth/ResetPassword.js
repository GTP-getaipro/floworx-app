import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
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
        const response = await fetch('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        setIsValidToken(response.ok);
        
        if (!response.ok) {
          const data = await response.json();
          setErrors({ token: data.error || 'Invalid or expired reset token' });
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidToken(false);
        setErrors({ token: 'Unable to verify reset token' });
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formValues.password
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const data = await response.json();
        setErrors({ submit: data.error?.message || 'Failed to reset password. Please try again.' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidToken === null) {
    return (
      <AuthLayout title="Verifying reset token...">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Please wait while we verify your reset token...</div>
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
        <div className="error-callout">
          {errors.token || 'This password reset link is no longer valid.'}
        </div>
        
        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">
            Request a new reset link
          </Link>
          <Link to="/login" className="auth-link">
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
        <div className="success-callout">
          Your password has been successfully reset. You can now sign in with your new password.
        </div>
        
        <div className="auth-links">
          <Link to="/login" className="auth-link">
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
        <div className="error-callout">
          {errors.submit}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="password" className="form-label">New Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className={`form-input ${formErrors.password ? 'error' : ''}`}
            value={formValues.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
            aria-invalid={!!formErrors.password}
            required
          />
          {formErrors.password && <div className="error-message">{formErrors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="confirm" className="form-label">Confirm New Password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            className={`form-input ${formErrors.confirm ? 'error' : ''}`}
            value={formValues.confirm}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
            aria-invalid={!!formErrors.confirm}
            required
          />
          {formErrors.confirm && <div className="error-message">{formErrors.confirm}</div>}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || (!isValid && Object.keys(touched).length > 0)}
        >
          {isSubmitting ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>

      <div className="auth-links">
        <Link to="/login" className="auth-link">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;

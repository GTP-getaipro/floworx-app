import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password
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
            className={`form-input ${errors.password ? 'error' : ''}`}
            value={formData.password}
            onChange={handleInputChange}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />
          {errors.password && <div className="error-message">{errors.password}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="••••••••"
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
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

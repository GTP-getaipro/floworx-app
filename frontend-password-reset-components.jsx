// Floworx Frontend Password Reset Components
// Add these components to your React frontend

// =====================================================
// 1. FORGOT PASSWORD COMPONENT (src/components/ForgotPassword.js)
// =====================================================

import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/api/password-reset/request', {
        email: email.trim().toLowerCase()
      });

      setMessage(response.data.message);
      setEmail(''); // Clear form

    } catch (err) {
      console.error('Password reset request error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to send password reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter your email address"
              className="form-input"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="auth-button primary"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Sending Reset Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <a href="/login" className="auth-link">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

// =====================================================
// 2. RESET PASSWORD COMPONENT (src/components/ResetPassword.js)
// =====================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token');
        setIsValidating(false);
        return;
      }

      try {
        await axios.post('/api/password-reset/validate', { token });
        setTokenValid(true);
      } catch (err) {
        setError(
          err.response?.data?.message || 
          'Invalid or expired reset token'
        );
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    
    return {
      valid: minLength && hasLower && hasUpper && hasNumber,
      requirements: {
        minLength,
        hasLower,
        hasUpper,
        hasNumber
      }
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError('Password does not meet security requirements');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/password-reset/reset', {
        token,
        password
      });

      setMessage(response.data.message);
      
      // Redirect to login after successful reset
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password reset successful. Please log in with your new password.' 
          }
        });
      }, 2000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading-state">
            <span className="loading-spinner large"></span>
            <p>Validating reset token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="error-state">
            <span className="error-icon large">⚠️</span>
            <h2>Invalid Reset Link</h2>
            <p>{error}</p>
            <a href="/forgot-password" className="auth-button primary">
              Request New Reset Link
            </a>
          </div>
        </div>
      </div>
    );
  }

  const passwordValidation = validatePassword(password);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Set New Password</h2>
          <p>Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter new password"
              className="form-input"
            />
            
            {password && (
              <div className="password-requirements">
                <div className={`requirement ${passwordValidation.requirements.minLength ? 'met' : ''}`}>
                  {passwordValidation.requirements.minLength ? '✅' : '❌'} At least 8 characters
                </div>
                <div className={`requirement ${passwordValidation.requirements.hasLower ? 'met' : ''}`}>
                  {passwordValidation.requirements.hasLower ? '✅' : '❌'} One lowercase letter
                </div>
                <div className={`requirement ${passwordValidation.requirements.hasUpper ? 'met' : ''}`}>
                  {passwordValidation.requirements.hasUpper ? '✅' : '❌'} One uppercase letter
                </div>
                <div className={`requirement ${passwordValidation.requirements.hasNumber ? 'met' : ''}`}>
                  {passwordValidation.requirements.hasNumber ? '✅' : '❌'} One number
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Confirm new password"
              className="form-input"
            />
            
            {confirmPassword && password !== confirmPassword && (
              <div className="error-text">Passwords do not match</div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading || 
              !password || 
              !confirmPassword || 
              password !== confirmPassword ||
              !passwordValidation.valid
            }
            className="auth-button primary"
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <a href="/login" className="auth-link">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

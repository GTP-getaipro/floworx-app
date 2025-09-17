import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import AuthLayout from '../../components/AuthLayout';
import { api } from '../../lib/api';

const VerifyEmail = () => {
  const [verificationState, setVerificationState] = useState('loading'); // loading, success, error, manual
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Get email from location state (from registration) or URL params
    const stateEmail = location.state?.email;
    const urlEmail = searchParams.get('email');
    setEmail(stateEmail || urlEmail || '');

    if (token) {
      // Auto-verify with token from URL
      verifyWithToken(token);
    } else if (location.state?.message) {
      // Show manual verification state (from registration)
      setVerificationState('manual');
    } else {
      // No token and no state, redirect to login
      navigate('/login');
    }
  }, [token, location.state, searchParams, navigate]);

  const verifyWithToken = async (verificationToken) => {
    try {
      const data = await api('/api/auth/verify', {
        method: 'POST',
        body: { token: verificationToken }
      });

      setVerificationState('success');
    } catch (error) {
      setVerificationState('error');
      if (error.status === 401) {
        setError('Invalid verification token. Please request a new verification email.');
      } else if (error.status === 410) {
        setError('This verification link has expired or has already been used. Please request a new verification email.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
    }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState('error');
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage('Please enter your email address');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendMessage('Verification email sent! Please check your inbox.');
      } else if (response.status === 429) {
        setResendMessage('Please wait before requesting another verification email.');
      } else {
        setResendMessage('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setResendMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (verificationState === 'loading') {
    return (
      <AuthLayout title="Verifying your email...">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div>Please wait while we verify your email address...</div>
        </div>
      </AuthLayout>
    );
  }

  if (verificationState === 'success') {
    return (
      <AuthLayout 
        title="Email verified successfully!" 
        subtitle="Your account is now active"
      >
        <div className="success-callout">
          Your email address has been verified. You can now sign in to your account and start using FloWorx.
        </div>
        
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            Sign in to your account
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (verificationState === 'error') {
    return (
      <AuthLayout 
        title="Verification failed" 
        subtitle="We couldn't verify your email address"
      >
        <div className="error-callout">
          {error}
        </div>
        
        <div className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={isResending}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleResendVerification}
            disabled={isResending || !email}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>

          {resendMessage && (
            <div className={resendMessage.includes('sent') ? 'success-callout' : 'error-callout'} style={{ marginTop: '16px' }}>
              {resendMessage}
            </div>
          )}
        </div>
        
        <div className="auth-links">
          <Link to="/login" className="auth-link">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // Manual verification state (from registration)
  return (
    <AuthLayout 
      title="Check your email" 
      subtitle="We've sent you a verification link"
    >
      <div className="success-callout">
        {location.state?.message || 'Please check your email and click the verification link to activate your account.'}
      </div>
      
      <div className="auth-form">
        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={isResending}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleResendVerification}
          disabled={isResending || !email}
        >
          {isResending ? 'Sending...' : 'Resend Verification Email'}
        </button>

        {resendMessage && (
          <div className={resendMessage.includes('sent') ? 'success-callout' : 'error-callout'} style={{ marginTop: '16px' }}>
            {resendMessage}
          </div>
        )}
      </div>
      
      <div className="auth-links">
        <Link to="/login" className="auth-link">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;

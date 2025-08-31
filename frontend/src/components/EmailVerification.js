import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './EmailVerification.css';

const EmailVerification = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error, resending
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const verifyEmail = useCallback(async (token) => {
    try {
      setStatus('verifying');
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/verify-email`, {
        token
      });

      setStatus('success');
      setMessage('Email verified successfully! Redirecting to your dashboard...');

      // Log the user in with the returned token
      if (response.data.token) {
        login(response.data.token, response.data.user);

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Email verification failed:', error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'Email verification failed');
      setCanResend(true);
    }
  }, [login, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const emailParam = urlParams.get('email');

    if (emailParam) {
      setEmail(emailParam);
    }

    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided');
      setCanResend(true);
    }
  }, [location, verifyEmail]);



  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    try {
      setStatus('resending');
      setCanResend(false);
      
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/resend-verification`, {
        email
      });

      setMessage('Verification email sent! Please check your inbox.');
      
      // Start cooldown timer
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage(error.response?.data?.message || 'Failed to resend verification email');
      setCanResend(true);
    } finally {
      setStatus('error'); // Reset to allow retry
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="verification-content">
            <div className="verification-spinner"></div>
            <h2>Verifying Your Email</h2>
            <p>Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="verification-content success">
            <div className="success-icon">✓</div>
            <h2>Email Verified Successfully!</h2>
            <p>{message}</p>
            <div className="success-animation">
              <div className="checkmark">
                <div className="checkmark-circle"></div>
                <div className="checkmark-stem"></div>
                <div className="checkmark-kick"></div>
              </div>
            </div>
          </div>
        );

      case 'error':
      case 'resending':
        return (
          <div className="verification-content error">
            <div className="error-icon">⚠️</div>
            <h2>Email Verification {status === 'resending' ? 'Resent' : 'Failed'}</h2>
            <p>{message}</p>
            
            <div className="resend-section">
              <h3>Need a new verification email?</h3>
              <div className="resend-form">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                />
                <button
                  onClick={handleResendVerification}
                  disabled={!canResend || status === 'resending'}
                  className="resend-button"
                >
                  {status === 'resending' ? (
                    <>
                      <div className="button-spinner"></div>
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    'Resend Verification Email'
                  )}
                </button>
              </div>
            </div>

            <div className="help-section">
              <h4>Still having trouble?</h4>
              <ul>
                <li>Check your spam/junk folder</li>
                <li>Make sure you're using the correct email address</li>
                <li>Try adding support@floworx-iq.com to your contacts</li>
                <li>Contact our support team if the problem persists</li>
              </ul>
              
              <div className="support-contact">
                <a href="mailto:support@floworx-iq.com" className="support-link">
                  Contact Support
                </a>
                <span className="divider">|</span>
                <button onClick={() => navigate('/login')} className="login-link">
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="email-verification-container">
      <div className="verification-card">
        <div className="verification-header">
          <div className="logo">
            <h1>Floworx</h1>
            <span className="tagline">Email Intelligence Platform</span>
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerification;

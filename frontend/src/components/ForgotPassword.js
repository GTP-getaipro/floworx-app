import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
// UI components are used in JSX but not directly referenced
import './PasswordReset.css';

// Define UI components
const Input = ({ type, placeholder, value, onChange, className, disabled, required }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={className}
    disabled={disabled}
    required={required}
  />
);

const Button = ({ type, onClick, disabled, className, children }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={className}>
    {children}
  </button>
);

const Alert = ({ type, children }) => <div className={`alert alert-${type}`}>{children}</div>;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [recoveryType, setRecoveryType] = useState('password_reset');
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);

  const checkAccountLockout = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/account-recovery/check-lockout`,
        {
          email: email.toLowerCase().trim(),
        }
      );

      if (response.data.success && response.data.locked) {
        setLockoutInfo(response.data);
        setShowRecoveryOptions(true);
      } else {
        setLockoutInfo(null);
        setShowRecoveryOptions(false);
      }
    } catch (error) {
      // Silently handle error - don't reveal account existence
      console.error('Lockout check error:', error);
    }
  }, [email]);

  useEffect(() => {
    if (email && email.includes('@')) {
      const timeoutId = setTimeout(() => {
        checkAccountLockout();
      }, 500); // Debounce the API call

      return () => clearTimeout(timeoutId);
    }
  }, [email, checkAccountLockout]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRateLimited(false);

    try {
      let response;

      if (recoveryType === 'password_reset') {
        response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/forgot-password`, {
          email: email.toLowerCase().trim(),
        });
      } else {
        response = await axios.post(`${process.env.REACT_APP_API_URL}/account-recovery/initiate`, {
          email: email.toLowerCase().trim(),
          recoveryType,
          recoveryData: { reason: 'user_requested' },
        });
      }

      if (response.data.success) {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Recovery request error:', error);

      if (error.response?.data) {
        setError(error.response.data.message);
        if (error.response.data.rateLimited) {
          setRateLimited(true);
        }
      } else {
        setError('Unable to process your request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    setEmail(e.target.value);
    if (error) setError('');
    if (rateLimited) setRateLimited(false);
  };

  const recoveryOptions = [
    {
      id: 'password_reset',
      title: 'Password Reset',
      description: 'Reset your password via email',
      icon: '🔑',
      recommended: true,
    },
    {
      id: 'account_recovery',
      title: 'Account Recovery',
      description: 'Full account recovery with multiple options',
      icon: '🔧',
      recommended: lockoutInfo?.locked,
    },
    {
      id: 'emergency_access',
      title: 'Emergency Access',
      description: 'Temporary access with limited functionality',
      icon: '🚨',
      recommended: false,
    },
  ];

  if (success) {
    return (
      <div className='auth-card'>
        <div className='success-message'>
          <div className='success-icon'>
            <span>📧</span>
          </div>
          <h2>Check Your Email</h2>
          <p>
            We've sent a password reset link to <strong>{email}</strong>
          </p>

          <div className='email-instructions'>
            <h3>What to do next:</h3>
            <ol>
              <li>Check your email inbox for a message from Floworx</li>
              <li>Click the "Reset My Password" button in the email</li>
              <li>Create a new secure password</li>
              <li>Log in with your new password</li>
            </ol>

            <div className='help-text'>
              <p>
                <strong>Didn't receive the email?</strong>
              </p>
              <ul>
                <li>Check your spam/junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes and check again</li>
                <li>The link expires in 60 minutes for security</li>
              </ul>
            </div>
          </div>

          <div className='action-buttons'>
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className='auth-button secondary'
            >
              Send Another Reset Link
            </button>
            <Link to='/login' className='auth-button primary'>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className='auth-card'>

        <div className='auth-header'>
          <h2>Reset Your Password</h2>
          <p className='auth-subtitle'>
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {error && (
          <div className={`error-message ${rateLimited ? 'rate-limited' : ''}`}>
            {error}
            {rateLimited && (
              <div className='rate-limit-info'>
                <p>For security reasons, password reset requests are limited.</p>
                <p>Please wait 15 minutes before trying again.</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className='auth-form'>
          <div className='form-group'>
            <Input
              label='Email Address'
              type='email'
              id='email'
              name='email'
              value={email}
              onChange={handleChange}
              placeholder='Enter your email address'
              required
              disabled={loading}
            />
          </div>

          {lockoutInfo && lockoutInfo.locked && (
            <Alert variant='warning' className='mb-4'>
              <strong>Account Locked:</strong> Your account is temporarily locked due to multiple
              failed login attempts. It will be unlocked in {lockoutInfo.remainingTime} minutes, or
              you can use account recovery options below.
            </Alert>
          )}

          {showRecoveryOptions && (
            <div className='recovery-options mb-4'>
              <h4 className='text-sm font-medium text-ink mb-3'>Recovery Options:</h4>
              <div className='space-y-2'>
                {recoveryOptions.map(option => (
                  <label
                    key={option.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      recoveryType === option.id
                        ? 'border-brand-primary bg-brand-primary-50'
                        : 'border-surface-border hover:border-brand-primary-200'
                    }`}
                  >
                    <input
                      type='radio'
                      name='recoveryType'
                      value={option.id}
                      checked={recoveryType === option.id}
                      onChange={e => setRecoveryType(e.target.value)}
                      className='sr-only'
                    />
                    <div className='flex items-center space-x-3 flex-1'>
                      <span className='text-2xl'>{option.icon}</span>
                      <div className='flex-1'>
                        <div className='flex items-center space-x-2'>
                          <span className='font-medium text-ink'>{option.title}</span>
                          {option.recommended && (
                            <span className='px-2 py-0.5 text-xs bg-success/10 text-success rounded-full'>
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-ink-sub'>{option.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button
            type='submit'
            variant='primary'
            className='w-full'
            loading={loading}
            disabled={loading || !email.trim()}
          >
            {recoveryType === 'password_reset' ? 'Send Reset Link' : 'Start Account Recovery'}
          </Button>
        </form>

        <div className='auth-links'>
          <p>
            Remember your password?{' '}
            <Link to='/login' className='auth-link'>
              Sign in here
            </Link>
          </p>
          <p>
            Don't have an account?{' '}
            <Link to='/register' className='auth-link'>
              Create one here
            </Link>
          </p>
        </div>

        <div className='security-notice'>
          <h4>🔒 Security Notice</h4>
          <p>
            For your security, password reset links expire after 60 minutes and can only be used
            once. If you don't receive an email, check your spam folder or contact support.
          </p>
        </div>
      </div>
  );
};


export default ForgotPassword;

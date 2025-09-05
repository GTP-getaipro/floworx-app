import React, { useState } from 'react';
import './StepStyles.css';

const WelcomeStep = ({ data, onComplete }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Redirect to Google OAuth
      const token = localStorage.getItem('token');
      window.location.href = `${process.env.REACT_APP_API_URL}/oauth/google?token=${token}`;
    } catch (error) {
      console.error('Google connection error:', error);
      setError('Failed to initiate Google connection');
      setConnecting(false);
    }
  };

  const handleSkipForNow = () => {
    // Allow user to skip Google connection for now
    onComplete({ googleConnected: false, skipped: true });
  };

  if (data.googleConnected) {
    return (
      <div className='step-content'>
        <div className='success-message'>
          <div className='success-icon'>✓</div>
          <h3>Google Account Connected!</h3>
          <p>Your Google Workspace account is successfully connected.</p>
          <div className='connected-account'>
            <strong>Connected as:</strong> {data.user?.email || 'Google User'}
          </div>
        </div>

        <div className='step-actions'>
          <button onClick={() => onComplete({ googleConnected: true })} className='primary-button'>
            Continue to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='step-content'>
      <div className='welcome-content'>
        <div className='welcome-icon'>
          <svg
            width='80'
            height='80'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M12 2L2 7L12 12L22 7L12 2Z'
              stroke='#4CAF50'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M2 17L12 22L22 17'
              stroke='#4CAF50'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M2 12L12 17L22 12'
              stroke='#4CAF50'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </div>

        <h3 data-testid="welcome-title">Welcome to Floworx Intelligence!</h3>
        <p className='welcome-description'>
          Transform your business email management with AI-powered automation. Let's connect your
          Google Workspace account to get started with intelligent email categorization and
          automated responses.
        </p>

        <div className='benefits-list'>
          <div className='benefit-item'>
            <span className='benefit-icon'>🤖</span>
            <div>
              <strong>AI-Powered Responses</strong>
              <p>Automatically generate intelligent replies to customer emails</p>
            </div>
          </div>
          <div className='benefit-item'>
            <span className='benefit-icon'>📧</span>
            <div>
              <strong>Smart Email Categorization</strong>
              <p>Organize emails by type: leads, support, invoices, and more</p>
            </div>
          </div>
          <div className='benefit-item'>
            <span className='benefit-icon'>⚡</span>
            <div>
              <strong>Instant Notifications</strong>
              <p>Alert your team when important emails arrive</p>
            </div>
          </div>
        </div>

        {error && (
          <div className='error-message'>
            <span className='error-icon'>⚠️</span>
            {error}
          </div>
        )}

        <div className='google-connect-section'>
          <h4>Connect Your Google Workspace</h4>
          <p>We need access to your Gmail to set up email automation.</p>

          <div className='permissions-info'>
            <h5>We'll request permission to:</h5>
            <ul>
              <li>Read your email messages</li>
              <li>Send emails on your behalf</li>
              <li>Create and manage Gmail labels</li>
              <li>Access your basic profile information</li>
            </ul>
          </div>
        </div>
      </div>

      <div className='step-actions'>
        <button
          onClick={handleGoogleConnect}
          disabled={connecting}
          className='primary-button google-connect-button'
          data-testid="continue-button"
        >
          {connecting ? (
            <>
              <div className='button-spinner' />
              Connecting...
            </>
          ) : (
            <>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
                <path
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  fill='#4285F4'
                />
                <path
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  fill='#34A853'
                />
                <path
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                  fill='#FBBC05'
                />
                <path
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  fill='#EA4335'
                />
              </svg>
              Connect with Google
            </>
          )}
        </button>

        <button onClick={handleSkipForNow} className='secondary-button' disabled={connecting}>
          Skip for Now
        </button>
      </div>

      <div className='security-note'>
        <span className='security-icon'>🔒</span>
        <small>
          Your data is encrypted and secure. We never store your passwords and you can revoke access
          at any time from your Google Account settings.
        </small>
      </div>
    </div>
  );
};

export default WelcomeStep;

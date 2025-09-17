import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './EmailVerification.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email and try again.');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Email verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="email-verification">
      <div className="verification-container">
        <div className="verification-content">
          {status === 'verifying' && (
            <>
              <div className="verification-spinner">
                <div className="spinner"></div>
              </div>
              <h2>Verifying your email...</h2>
              <p>Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="verification-icon success">✅</div>
              <h2>Email Verified!</h2>
              <p>{message}</p>
              <p className="redirect-notice">
                Redirecting to login page in 3 seconds...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="verification-icon error">❌</div>
              <h2>Verification Failed</h2>
              <p>{message}</p>
              <div className="verification-actions">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn primary"
                >
                  Go to Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn secondary"
                >
                  Register Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

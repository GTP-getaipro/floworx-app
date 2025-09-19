import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { Logo } from '../components/ui';

/**
 * EmailVerificationPage - Email Verification Handler Page
 *
 * Handles email verification process by processing verification tokens
 * from email links and providing comprehensive user feedback.
 *
 * @component
 * @example
 * // Usage in router for email verification
 * <Route path="/verify-email" element={<EmailVerificationPage />} />
 * // URL: /verify-email?token=abc123
 *
 * @features
 * - Automatic token processing from URL parameters
 * - Multiple verification states (verifying, success, error, expired)
 * - Toast notifications for user feedback
 * - Email resend functionality for failed verifications
 * - Automatic redirect to login after successful verification
 * - Professional error handling with recovery options
 * - Responsive design with consistent branding
 *
 * @dependencies
 * - React Router: useSearchParams, useNavigate, Link
 * - ToastContext: User notifications and feedback
 * - Logo: FloWorx branding component
 * - API: Email verification endpoints
 */
const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  
  const [verificationState, setVerificationState] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationState('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationState('success');
        setMessage(data.message || 'Email verified successfully!');
        setEmail(data.email || '');
        showSuccess('🎉 Email verified! You can now log in to your account.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Email verified successfully! Please log in to continue.',
              email: data.email 
            }
          });
        }, 3000);
      } else {
        const errorCode = data.error?.code;
        
        if (errorCode === 'TOKEN_EXPIRED') {
          setVerificationState('expired');
          setMessage('Your verification link has expired. Please request a new one.');
        } else if (response.status === 200 && data.alreadyVerified) {
          setVerificationState('success');
          setMessage('Your email is already verified! You can log in to your account.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setVerificationState('error');
          setMessage(data.error?.message || 'Verification failed. Please try again.');
        }
        
        if (errorCode !== 'TOKEN_EXPIRED' && !data.alreadyVerified) {
          showError(`❌ ${data.error?.message || 'Verification failed'}`);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState('error');
      setMessage('Network error. Please check your connection and try again.');
      showError('❌ Network error during verification');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      showError('❌ Email address not available for resend');
      return;
    }

    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccess('📧 Verification email sent! Please check your inbox.');
        setMessage('A new verification email has been sent. Please check your inbox and click the verification link.');
      } else {
        showError(`❌ ${data.error?.message || 'Failed to send verification email'}`);
      }
    } catch (error) {
      console.error('Resend error:', error);
      showError('❌ Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationState) {
      case 'verifying':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-ink-primary mb-4">Verifying Your Email</h2>
            <p className="text-ink-sub">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Email Verified Successfully!</h2>
            <p className="text-ink-sub mb-6">{message}</p>
            <p className="text-sm text-ink-sub">Redirecting to login page in 3 seconds...</p>
            <Link 
              to="/login" 
              className="inline-block mt-4 bg-brand-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-primary-dark transition-colors"
            >
              Continue to Login
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-600 mb-4">Verification Link Expired</h2>
            <p className="text-ink-sub mb-6">{message}</p>
            {email && (
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="bg-brand-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending...' : 'Send New Verification Email'}
              </button>
            )}
            <div className="mt-4">
              <Link to="/login" className="text-brand-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Verification Failed</h2>
            <p className="text-ink-sub mb-6">{message}</p>
            <div className="space-y-3">
              <Link 
                to="/register" 
                className="block bg-brand-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-primary-dark transition-colors"
              >
                Create New Account
              </Link>
              <Link to="/login" className="block text-brand-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Logo variant="blue-on-white" size="large" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-ink-primary">FloWorx</h1>
          <p className="text-ink-sub">Email AI Built by Hot Tub Pros—For Hot Tub Pros</p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-card-blue p-8">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-ink-sub">
          <p>© 2024 FloWorx. Email AI for Hot Tub Professionals.</p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;

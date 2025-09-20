import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

const CheckEmailMessage = ({ email, onResend, onBack }) => {
  const { showSuccess, showError } = useToast();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      showError('❌ Email address not available');
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
        if (onResend) onResend();
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

  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
      </div>

      {/* Main Message */}
      <div>
        <h2 className="text-2xl font-bold text-ink-primary mb-3">Check Your Email</h2>
        <p className="text-ink-sub text-lg mb-2">
          We've sent a verification link to:
        </p>
        <p className="text-brand-primary font-semibold text-lg mb-4">
          {email}
        </p>
        <p className="text-ink-sub">
          Click the link in the email to verify your account and complete your registration.
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
        <h3 className="font-semibold text-ink-primary mb-2">Next Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-ink-sub">
          <li>Check your email inbox (and spam folder)</li>
          <li>Click the "Verify My Email Address" button in the email</li>
          <li>You'll be redirected back to log in</li>
          <li>Start automating your hot tub business emails!</li>
        </ol>
      </div>

      {/* Resend Section */}
      <div className="border-t pt-6">
        <p className="text-sm text-ink-sub mb-3">
          Didn't receive the email?
        </p>
        <button
          onClick={handleResendEmail}
          disabled={isResending}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-3"
        >
          {isResending ? 'Sending...' : 'Resend Verification Email'}
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="text-brand-primary hover:underline font-medium"
          >
            Back to Registration
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-ink-sub space-y-1">
        <p>The verification link will expire in 24 hours for security.</p>
        <p>
          Need help? Contact us at{' '}
          <a href="mailto:support@floworx-iq.com" className="text-brand-primary hover:underline">
            support@floworx-iq.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default CheckEmailMessage;

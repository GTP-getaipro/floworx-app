import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/auth/Button";
import Input from "../components/auth/Input";
import { api } from "../lib/api";
import { handleReturnToFromQuery, getReturnTo, clearReturnTo } from "../lib/returnTo";

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Handle returnTo from query params on mount
    handleReturnToFromQuery(searchParams);

    if (!token) {
      setIsLoading(false);
      setError('No verification token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const returnTo = getReturnTo();
        const response = await api('/api/auth/verify', {
          method: 'POST',
          body: { token, ...(returnTo && { returnTo }) }
        });
        setIsSuccess(true);

        // Redirect after successful verification
        clearReturnTo();
        const redirectTo = response.returnTo || returnTo || '/login?verified=1';
        setTimeout(() => navigate(redirectTo), 2000); // Give user time to read success message
      } catch (error) {
        if (error.code === 'INVALID_TOKEN') {
          setError('Verification link invalid');
        } else if (error.code === 'TOKEN_EXPIRED') {
          setError('Link expired. Resend verification.');
        } else {
          setError('Verification failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, searchParams, navigate]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      await api('/api/auth/resend', { 
        method: 'POST', 
        body: { email } 
      });
      setResendSuccess(true);
    } catch (error) {
      // Don't show errors for resend to avoid revealing user existence
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <AuthLayout title="Verifying email..." subtitle="Please wait while we verify your email">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-300 mx-auto"></div>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Email verified!" subtitle="Your email has been successfully verified">
        <div className="text-center space-y-4">
          <div 
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
            role="status"
            aria-live="polite"
          >
            Your email has been verified successfully. You can now sign in to your account.
          </div>
          <div className="flex justify-center pt-2">
            <a
              href="/login"
              className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
            >
              Continue to sign in
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Email verification" subtitle="There was an issue verifying your email">
      <div className="space-y-4">
        <div 
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>

        {error.includes('expired') && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your email address to receive a new verification link:
            </p>
            
            {resendSuccess ? (
              <div 
                className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
                role="status"
                aria-live="polite"
              >
                If an account exists with that email, we've sent a new verification link.
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-4">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
                <Button
                  type="submit"
                  disabled={isResending || !email.trim()}
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <a
            href="/login"
            className="text-brand-300 hover:text-white underline-offset-4 hover:underline text-sm text-center"
          >
            Back to sign in
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}

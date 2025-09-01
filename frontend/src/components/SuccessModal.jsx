import React, { useEffect } from 'react';

/**
 * Success Modal Component
 * Shows success messages with optional auto-redirect
 */
const SuccessModal = ({ 
  isOpen, 
  onClose, 
  title = 'Success!', 
  message, 
  redirectUrl = null,
  redirectDelay = 3000,
  showRedirectTimer = true,
  actions = null
}) => {
  const [countdown, setCountdown] = React.useState(Math.floor(redirectDelay / 1000));

  useEffect(() => {
    if (isOpen && redirectUrl && showRedirectTimer) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = redirectUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, redirectUrl, redirectDelay, showRedirectTimer]);

  useEffect(() => {
    if (isOpen && redirectUrl && !showRedirectTimer) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, redirectDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, redirectUrl, redirectDelay, showRedirectTimer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
            {title}
          </h3>

          {/* Message */}
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              {message}
            </p>
          </div>

          {/* Redirect Timer */}
          {redirectUrl && showRedirectTimer && countdown > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((Math.floor(redirectDelay / 1000) - countdown) / Math.floor(redirectDelay / 1000)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="items-center px-4 py-3">
            {actions ? (
              <div className="flex flex-col space-y-2">
                {actions}
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {redirectUrl && (
                  <button
                    onClick={() => window.location.href = redirectUrl}
                    className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    Continue
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Registration Success Modal
 * Specific modal for successful account creation
 */
export const RegistrationSuccessModal = ({ isOpen, onClose, userEmail }) => (
  <SuccessModal
    isOpen={isOpen}
    onClose={onClose}
    title="Account Created Successfully!"
    message={`Welcome to FloWorx! We've sent a verification email to ${userEmail}. Please check your inbox and click the verification link to activate your account.`}
    redirectUrl="/dashboard"
    redirectDelay={5000}
    actions={
      <>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => window.location.href = '/verify-email'}
          className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300"
        >
          Verify Email Now
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Close
        </button>
      </>
    }
  />
);

/**
 * OAuth Success Modal
 * Specific modal for successful OAuth connection
 */
export const OAuthSuccessModal = ({ isOpen, onClose, provider = 'Google' }) => (
  <SuccessModal
    isOpen={isOpen}
    onClose={onClose}
    title={`${provider} Account Connected!`}
    message={`Your ${provider} account has been successfully connected. You can now start automating your email workflows with FloWorx AI.`}
    redirectUrl="/dashboard"
    redirectDelay={3000}
    actions={
      <>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Start Automating
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Close
        </button>
      </>
    }
  />
);

export default SuccessModal;

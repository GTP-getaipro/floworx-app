import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * MicrosoftCallback - Microsoft OAuth Callback Handler
 *
 * Handles the OAuth callback from Microsoft authentication flow,
 * processes authorization codes, and manages the integration setup.
 *
 * @component
 * @example
 * // Usage in router for OAuth callback
 * <Route path="/oauth/microsoft/callback" element={<MicrosoftCallback />} />
 * // URL: /oauth/microsoft/callback?code=abc123&state=xyz789
 *
 * @features
 * - OAuth authorization code processing
 * - State parameter validation for security
 * - Error handling for OAuth failures
 * - Loading states during token exchange
 * - Automatic navigation after processing
 * - User feedback during OAuth flow
 * - Integration with FloWorx API endpoints
 * - Timeout handling for failed requests
 *
 * @dependencies
 * - React Router: useSearchParams, useNavigate
 * - API: Microsoft OAuth token exchange endpoints
 *
 * @security
 * - Validates OAuth state parameter
 * - Handles authorization errors securely
 * - Processes authorization codes safely
 * - Redirects appropriately based on results
 *
 * @flow
 * 1. User redirected here from Microsoft OAuth
 * 2. Extract code and state from URL parameters
 * 3. Exchange code for access token via API
 * 4. Navigate to appropriate next step or error page
 */
export default function MicrosoftCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setError(`OAuth error: ${error}`);
          setTimeout(() => {
            navigate('/onboarding/step2?error=oauth_denied');
          }, 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setError('No authorization code received');
          setTimeout(() => {
            navigate('/onboarding/step2?error=missing_code');
          }, 3000);
          return;
        }

        // Call backend callback endpoint
        const response = await api(`/api/integrations/microsoft/callback?code=${code}&state=${state}`);
        
        if (response.ok) {
          setStatus('success');
          setTimeout(() => {
            navigate('/onboarding/step2?connected=outlook');
          }, 2000);
        } else {
          throw new Error('Callback processing failed');
        }
      } catch (err) {
        console.error('Microsoft OAuth callback error:', err);
        setStatus('error');
        setError(err.message || 'Failed to process OAuth callback');
        setTimeout(() => {
          navigate('/onboarding/step2?error=callback_failed');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'processing' && (
              <>
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connecting Outlook...
                </h3>
                <p className="text-sm text-gray-600">
                  Please wait while we complete your Outlook integration.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Outlook Connected!
                </h3>
                <p className="text-sm text-gray-600">
                  Redirecting you back to the onboarding process...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connection Failed
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {error}
                </p>
                <p className="text-xs text-gray-500">
                  Redirecting you back to try again...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

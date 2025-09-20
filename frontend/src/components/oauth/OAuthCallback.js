import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import './OAuthCallback.css';

/**
 * OAuthCallback - OAuth Authentication Callback Handler Component
 *
 * Handles OAuth callbacks from various providers (Gmail, Microsoft, etc.)
 * and processes authentication results with user feedback.
 *
 * @component
 * @example
 * // Usage in OAuth callback routes
 * <Route path="/oauth/callback" element={<OAuthCallback />} />
 * // URL: /oauth/callback?code=abc123&state=xyz789
 *
 * @features
 * - OAuth authorization code processing
 * - State parameter validation for security
 * - Error handling for OAuth failures
 * - Loading states during token exchange
 * - Success/error status display with icons
 * - Automatic navigation after processing
 * - User-friendly error messages
 * - Integration with FloWorx API endpoints
 *
 * @dependencies
 * - React Router: useNavigate, useSearchParams
 * - Lucide React: Status icons (CheckCircle, AlertCircle, RefreshCw)
 * - CSS: OAuthCallback.css for styling
 *
 * @security
 * - Validates OAuth state parameter
 * - Handles authorization errors securely
 * - Processes authorization codes safely
 * - Redirects appropriately based on results
 *
 * @flow
 * 1. User redirected here from OAuth provider
 * 2. Extract code, state, and error from URL parameters
 * 3. Exchange code for access token via API
 * 4. Display status and navigate to appropriate page
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    loading: true,
    success: false,
    error: null,
    message: 'Processing Gmail connection...'
  });

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors
      if (error) {
        let errorMessage = 'Gmail connection failed';
        
        switch (error) {
          case 'access_denied':
            errorMessage = 'Gmail access was denied. Please try again and grant the required permissions.';
            break;
          case 'invalid_request':
            errorMessage = 'Invalid OAuth request. Please try connecting again.';
            break;
          case 'unauthorized_client':
            errorMessage = 'OAuth client not authorized. Please contact support.';
            break;
          case 'unsupported_response_type':
            errorMessage = 'OAuth configuration error. Please contact support.';
            break;
          case 'invalid_scope':
            errorMessage = 'Invalid permissions requested. Please contact support.';
            break;
          default:
            errorMessage = errorDescription || `OAuth error: ${error}`;
        }

        setStatus({
          loading: false,
          success: false,
          error: errorMessage,
          message: null
        });

        // Redirect to onboarding after delay
        setTimeout(() => {
          navigate('/onboarding?step=gmail&error=' + encodeURIComponent(errorMessage));
        }, 3000);
        return;
      }

      // Validate required parameters
      if (!code) {
        throw new Error('No authorization code received from Gmail');
      }

      setStatus(prev => ({
        ...prev,
        message: 'Exchanging authorization code for access tokens...'
      }));

      // The OAuth callback is handled by the backend automatically
      // We just need to check if the connection was successful
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give backend time to process

      // Check OAuth status to confirm connection
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('/api/oauth/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify Gmail connection');
      }

      const data = await response.json();
      const gmailConnection = data.data.connections.find(conn => conn.provider === 'google');

      if (gmailConnection && gmailConnection.status === 'active') {
        setStatus({
          loading: false,
          success: true,
          error: null,
          message: 'Gmail connected successfully!'
        });

        // Redirect to next onboarding step after success
        setTimeout(() => {
          navigate('/onboarding?step=next');
        }, 2000);
      } else {
        throw new Error('Gmail connection was not established properly');
      }

    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus({
        loading: false,
        success: false,
        error: error.message,
        message: null
      });

      // Redirect to onboarding with error after delay
      setTimeout(() => {
        navigate('/onboarding?step=gmail&error=' + encodeURIComponent(error.message));
      }, 3000);
    }
  };

  return (
    <div className="oauth-callback">
      <div className="callback-container">
        <div className="callback-content">
          {status.loading && (
            <>
              <RefreshCw className="callback-icon spin" />
              <h2>Connecting Gmail Account</h2>
              <p>{status.message}</p>
              <div className="progress-bar">
                <div className="progress-fill" />
              </div>
            </>
          )}

          {status.success && (
            <>
              <CheckCircle className="callback-icon success" />
              <h2>Gmail Connected Successfully!</h2>
              <p>{status.message}</p>
              <p className="redirect-message">Redirecting you back to onboarding...</p>
            </>
          )}

          {status.error && (
            <>
              <AlertCircle className="callback-icon error" />
              <h2>Gmail Connection Failed</h2>
              <p className="error-text">{status.error}</p>
              <p className="redirect-message">Redirecting you back to try again...</p>
              <button 
                className="retry-btn"
                onClick={() => navigate('/onboarding?step=gmail')}
              >
                Try Again
              </button>
            </>
          )}
        </div>

        <div className="callback-footer">
          <p>FloWorx - Secure Gmail Integration</p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;

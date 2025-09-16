import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import './GmailOAuthStep.css';

const GmailOAuthStep = ({ onNext, onBack, onComplete, data, isFirstStep, isLastStep }) => {
  const [oauthStatus, setOauthStatus] = useState({
    loading: true,
    connected: false,
    connections: [],
    error: null
  });
  const [connecting, setConnecting] = useState(false);

  // Check OAuth status on component mount
  useEffect(() => {
    checkOAuthStatus();
  }, []);

  const checkOAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setOauthStatus({
          loading: false,
          connected: false,
          connections: [],
          error: 'Authentication required'
        });
        return;
      }

      const response = await fetch('/api/oauth/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const gmailConnection = data.data.connections.find(conn => conn.provider === 'google');
        
        setOauthStatus({
          loading: false,
          connected: data.data.active > 0,
          connections: data.data.connections,
          error: null,
          gmailConnection
        });
      } else {
        throw new Error('Failed to check OAuth status');
      }
    } catch (error) {
      console.error('OAuth status check failed:', error);
      setOauthStatus({
        loading: false,
        connected: false,
        connections: [],
        error: error.message
      });
    }
  };

  const initiateGmailOAuth = async () => {
    try {
      setConnecting(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/oauth/google?token=${token}`;
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      setOauthStatus(prev => ({
        ...prev,
        error: error.message
      }));
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/oauth/google', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await checkOAuthStatus(); // Refresh status
      } else {
        throw new Error('Failed to disconnect Gmail');
      }
    } catch (error) {
      console.error('Gmail disconnect failed:', error);
      setOauthStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  const refreshConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/oauth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider: 'google' })
      });

      if (response.ok) {
        await checkOAuthStatus(); // Refresh status
      } else {
        throw new Error('Failed to refresh connection');
      }
    } catch (error) {
      console.error('Connection refresh failed:', error);
      setOauthStatus(prev => ({
        ...prev,
        error: error.message
      }));
    }
  };

  if (oauthStatus.loading) {
    return (
      <div className="gmail-oauth-step">
        <div className="step-header">
          <Mail className="step-icon" />
          <h2>Connect Your Gmail Account</h2>
          <p>Checking your Gmail connection status...</p>
        </div>
        <div className="loading-spinner">
          <RefreshCw className="spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="gmail-oauth-step">
      <div className="step-header">
        <Mail className="step-icon" />
        <h2>Connect Your Gmail Account</h2>
        <p>FloWorx needs access to your Gmail account to automate email processing and create intelligent responses.</p>
      </div>

      <div className="oauth-content">
        {oauthStatus.error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{oauthStatus.error}</span>
          </div>
        )}

        {!oauthStatus.connected ? (
          <div className="connection-section">
            <div className="gmail-permissions">
              <h3>What FloWorx will access:</h3>
              <ul className="permissions-list">
                <li>
                  <CheckCircle className="permission-icon" />
                  <span>Read your emails to categorize and process them</span>
                </li>
                <li>
                  <CheckCircle className="permission-icon" />
                  <span>Create labels to organize your emails automatically</span>
                </li>
                <li>
                  <CheckCircle className="permission-icon" />
                  <span>Create draft responses for sales and support emails</span>
                </li>
                <li>
                  <CheckCircle className="permission-icon" />
                  <span>Access your email folders and labels</span>
                </li>
              </ul>
            </div>

            <button 
              className="connect-gmail-btn"
              onClick={initiateGmailOAuth}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <RefreshCw className="btn-icon spin" />
                  Connecting to Gmail...
                </>
              ) : (
                <>
                  <Mail className="btn-icon" />
                  Connect Gmail Account
                  <ExternalLink className="external-icon" />
                </>
              )}
            </button>

            <div className="security-note">
              <p>🔒 Your Gmail credentials are encrypted and stored securely. FloWorx follows industry-standard security practices.</p>
            </div>
          </div>
        ) : (
          <div className="connected-section">
            <div className="connection-status">
              <CheckCircle className="success-icon" />
              <div className="status-info">
                <h3>Gmail Connected Successfully!</h3>
                <p>Your Gmail account is connected and ready for automation.</p>
                {oauthStatus.gmailConnection && (
                  <div className="connection-details">
                    <p><strong>Status:</strong> {oauthStatus.gmailConnection.status}</p>
                    {oauthStatus.gmailConnection.expiryDate && (
                      <p><strong>Expires:</strong> {new Date(oauthStatus.gmailConnection.expiryDate).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="connection-actions">
              <button 
                className="refresh-btn"
                onClick={refreshConnection}
                title="Refresh connection"
              >
                <RefreshCw className="btn-icon" />
                Refresh
              </button>
              
              <button 
                className="disconnect-btn"
                onClick={disconnectGmail}
                title="Disconnect Gmail"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="step-navigation">
        {!isFirstStep && (
          <button className="nav-btn secondary" onClick={onBack}>
            Back
          </button>
        )}

        <button
          className="nav-btn primary"
          onClick={() => {
            if (oauthStatus.connected && onComplete) {
              onComplete({ gmailConnected: true });
            } else if (oauthStatus.connected && onNext) {
              onNext();
            }
          }}
          disabled={!oauthStatus.connected}
        >
          {oauthStatus.connected ? (isLastStep ? 'Complete Setup' : 'Continue') : 'Connect Gmail to Continue'}
        </button>
      </div>
    </div>
  );
};

export default GmailOAuthStep;

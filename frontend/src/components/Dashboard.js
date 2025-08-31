import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import OnboardingWizard from './OnboardingWizard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const location = useLocation();

  // Check for URL parameters (success/error messages from OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const connected = urlParams.get('connected');
    const errorParam = urlParams.get('error');

    if (connected === 'google') {
      setMessage('Google account connected successfully! Your automations are now active.');
      // Clear URL parameters
      window.history.replaceState({}, document.title, location.pathname);
    } else if (errorParam) {
      const errorMessages = {
        'oauth_denied': 'Google connection was cancelled. Please try again if you want to connect.',
        'invalid_callback': 'Invalid OAuth callback. Please try connecting again.',
        'connection_failed': 'Failed to connect to Google. Please try again.'
      };
      setError(errorMessages[errorParam] || 'An error occurred during connection.');
      // Clear URL parameters
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  // Fetch user status and onboarding status on component mount
  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch user status
        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/auth/user/status`, { headers });
        setUserStatus(userResponse.data);

        // Fetch onboarding status
        const onboardingResponse = await axios.get(`${process.env.REACT_APP_API_URL}/onboarding/status`, { headers });
        setOnboardingStatus(onboardingResponse.data);

        // Show onboarding if not completed
        if (!onboardingResponse.data.user.onboardingCompleted) {
          setShowOnboarding(true);
        }

      } catch (error) {
        console.error('Error fetching status:', error);
        setError('Failed to load user status');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStatus();
  }, []);

  const handleConnectGoogle = () => {
    // Redirect to backend OAuth endpoint
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    window.location.href = `${backendUrl}/oauth/google`;
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google account? This will stop all automations.')) {
      return;
    }

    try {
      await axios.delete('/oauth/google');
      setMessage('Google account disconnected successfully.');
      // Refresh status
      const response = await axios.get('/auth/user/status');
      setUserStatus(response.data);
    } catch (error) {
      setError('Failed to disconnect Google account. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh user status
    window.location.reload();
  };

  // Show onboarding wizard if user hasn't completed onboarding
  if (showOnboarding && onboardingStatus) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasGoogleConnection = userStatus?.has_google_connection;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Welcome, {user?.email}</h2>
          <p>Manage your email automation connections</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Sign Out
        </button>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="dashboard-content">
        <div className="connection-card">
          <div className="connection-header">
            <h3>Google Account Integration</h3>
            <div className={`connection-status ${hasGoogleConnection ? 'connected' : 'disconnected'}`}>
              {hasGoogleConnection ? '🟢 Connected' : '🔴 Not Connected'}
            </div>
          </div>

          <div className="connection-body">
            {hasGoogleConnection ? (
              <div className="connected-state">
                <div className="success-icon">✅</div>
                <h4>Connection Successful!</h4>
                <p>Your FloWorx email automations are now active and running.</p>
                <p className="connection-details">
                  Connected on: {new Date(userStatus.connected_services.find(s => s.service === 'google')?.connected_at).toLocaleDateString()}
                </p>
                <div className="connection-actions">
                  <button 
                    onClick={handleDisconnectGoogle}
                    className="auth-button secondary"
                  >
                    Disconnect Google Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="disconnected-state">
                <div className="connect-icon">🔗</div>
                <h4>Connect Your Google Account</h4>
                <p>Connect your Google account to start automating your hot tub business emails with FloWorx AI.</p>
                <ul className="benefits-list">
                  <li>📧 Automated email sorting and prioritization</li>
                  <li>🤖 AI-powered customer responses</li>
                  <li>⚡ Faster response times to service calls</li>
                  <li>🔒 Secure, encrypted connections</li>
                </ul>
                <button 
                  onClick={handleConnectGoogle}
                  className="auth-button primary large"
                >
                  Connect Your Google Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="info-section">
          <h3>How It Works</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-icon">🔐</div>
              <h4>Secure Connection</h4>
              <p>Your credentials are encrypted and stored securely using industry-standard encryption.</p>
            </div>
            <div className="info-item">
              <div className="info-icon">⚡</div>
              <h4>Real-time Processing</h4>
              <p>Our system monitors your emails every 5 minutes and triggers intelligent responses.</p>
            </div>
            <div className="info-item">
              <div className="info-icon">🎯</div>
              <h4>Hot Tub Expertise</h4>
              <p>Built by spa professionals who understand your business challenges.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

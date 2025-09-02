import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import OnboardingWizard from './OnboardingWizard';
import { Button, Alert, Card, Badge } from './ui';

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
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Card className="text-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="text-ink-sub">Loading dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  const hasGoogleConnection = userStatus?.has_google_connection;

  return (
    <div className="min-h-screen bg-surface-soft">
      <div className="bg-surface border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-ink">Welcome, {user?.email}</h1>
              <p className="text-ink-sub mt-1">Manage your email automation connections</p>
            </div>
            <Button onClick={handleLogout} variant="secondary">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <Alert variant="success" className="mb-6">
            {message}
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mb-6">
            {error}
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <Card.Header>
              <div className="flex justify-between items-center">
                <Card.Title>Google Account Integration</Card.Title>
                <Badge variant={hasGoogleConnection ? 'success' : 'danger'}>
                  {hasGoogleConnection ? 'Connected' : 'Not Connected'}</Badge>
              </div>
            </Card.Header>

          <Card.Content>
            {hasGoogleConnection ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Connection Successful!</h3>
                <p className="text-ink-sub mb-4">Your FloWorx email automations are now active and running.</p>
                <p className="text-sm text-ink-sub mb-6">
                  Connected on: {new Date(userStatus.connected_services.find(s => s.service === 'google')?.connected_at).toLocaleDateString()}
                </p>
                <Button
                  onClick={handleDisconnectGoogle}
                  variant="danger"
                >
                  Disconnect Google Account
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-brand-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Connect Your Google Account</h3>
                <p className="text-ink-sub mb-6">Connect your Google account to start automating your hot tub business emails with FloWorx AI.</p>
                <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-primary">📧</span>
                    <span className="text-sm text-ink">Automated email sorting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-primary">🤖</span>
                    <span className="text-sm text-ink">AI-powered responses</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-primary">⚡</span>
                    <span className="text-sm text-ink">Faster response times</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-brand-primary">🔒</span>
                    <span className="text-sm text-ink">Secure connections</span>
                  </div>
                </div>
                <Button
                  onClick={handleConnectGoogle}
                  variant="primary"
                  size="lg"
                >
                  Connect Your Google Account
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>

          <Card>
            <Card.Header>
              <Card.Title>How It Works</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-brand-primary-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <h4 className="font-semibold text-ink mb-2">Secure Connection</h4>
                  <p className="text-sm text-ink-sub">Your credentials are encrypted and stored securely using industry-standard encryption.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-brand-primary-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className="font-semibold text-ink mb-2">Real-time Processing</h4>
                  <p className="text-sm text-ink-sub">Our system monitors your emails every 5 minutes and triggers intelligent responses.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-brand-primary-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h4 className="font-semibold text-ink mb-2">Hot Tub Expertise</h4>
                  <p className="text-sm text-ink-sub">Built by spa professionals who understand your business challenges.</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

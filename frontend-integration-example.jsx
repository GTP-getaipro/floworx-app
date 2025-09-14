// Example React component for the new onboarding flow
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmailProviderOnboarding = () => {
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await axios.get('/api/onboarding/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOnboardingStatus(response.data);
      setSelectedProvider(response.data.emailProvider || '');
      setSelectedBusinessType(response.data.businessTypeId || '');
    } catch (error) {
      console.error('Failed to fetch onboarding status:', error);
    }
  };

  const selectEmailProvider = async (provider) => {
    setLoading(true);
    try {
      await axios.post('/api/onboarding/email-provider', 
        { provider },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setSelectedProvider(provider);
      await fetchOnboardingStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to select email provider:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectBusinessType = async (businessTypeId) => {
    setLoading(true);
    try {
      await axios.post('/api/business-types/select',
        { businessTypeId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setSelectedBusinessType(businessTypeId);
      await fetchOnboardingStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to select business type:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomSettings = async (settings) => {
    setLoading(true);
    try {
      await axios.post('/api/onboarding/custom-settings',
        { settings },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      await fetchOnboardingStatus(); // Refresh status
    } catch (error) {
      console.error('Failed to save custom settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!onboardingStatus) {
    return <div>Loading onboarding status...</div>;
  }

  const { nextStep, businessTypes, emailProvider, businessTypeId } = onboardingStatus;

  return (
    <div className="onboarding-container">
      <h2>Complete Your Setup</h2>
      
      {/* Step 1: Email Provider Selection */}
      {nextStep === 'email-provider' && (
        <div className="onboarding-step">
          <h3>Select Your Email Provider</h3>
          <p>Which email service do you use for your business?</p>
          <div className="provider-options">
            <button
              onClick={() => selectEmailProvider('gmail')}
              disabled={loading}
              className={`provider-btn ${selectedProvider === 'gmail' ? 'selected' : ''}`}
            >
              <img src="/gmail-icon.png" alt="Gmail" />
              Gmail
            </button>
            <button
              onClick={() => selectEmailProvider('outlook')}
              disabled={loading}
              className={`provider-btn ${selectedProvider === 'outlook' ? 'selected' : ''}`}
            >
              <img src="/outlook-icon.png" alt="Outlook" />
              Outlook
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Business Type Selection */}
      {nextStep === 'business-type' && (
        <div className="onboarding-step">
          <h3>Select Your Business Type</h3>
          <p>What type of business do you run?</p>
          <div className="business-type-grid">
            {businessTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => selectBusinessType(type.id)}
                disabled={loading}
                className={`business-type-btn ${selectedBusinessType === type.id ? 'selected' : ''}`}
              >
                <h4>{type.name}</h4>
                <p>{type.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Google Connection */}
      {nextStep === 'google-connection' && (
        <div className="onboarding-step">
          <h3>Connect Your Gmail Account</h3>
          <p>Connect your {emailProvider} account to start automating your emails.</p>
          <button 
            onClick={() => window.location.href = '/api/oauth/google'}
            className="connect-btn"
          >
            Connect {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'}
          </button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="progress-indicator">
        <div className="progress-steps">
          <div className={`step ${emailProvider ? 'completed' : nextStep === 'email-provider' ? 'active' : ''}`}>
            Email Provider
          </div>
          <div className={`step ${businessTypeId ? 'completed' : nextStep === 'business-type' ? 'active' : ''}`}>
            Business Type
          </div>
          <div className={`step ${nextStep === 'google-connection' ? 'active' : ''}`}>
            Connect Email
          </div>
        </div>
      </div>

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <h4>Debug Info:</h4>
          <pre>{JSON.stringify(onboardingStatus, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default EmailProviderOnboarding;

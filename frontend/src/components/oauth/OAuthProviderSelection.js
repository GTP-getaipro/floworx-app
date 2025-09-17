import React, { useState } from 'react';
import './OAuthProviderSelection.css';

const OAuthProviderSelection = ({ onProviderSelect, isLoading = false }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);

  const providers = [
    {
      id: 'google',
      name: 'Gmail',
      displayName: 'Connect Gmail',
      description: 'Access your Gmail emails and labels',
      icon: '📧',
      color: '#4285f4',
      features: [
        'Read and organize emails',
        'Create labels and filters',
        'Draft automated responses',
        'Access calendar events'
      ]
    },
    {
      id: 'microsoft',
      name: 'Outlook',
      displayName: 'Connect Outlook',
      description: 'Access your Outlook emails and folders',
      icon: '📮',
      color: '#0078d4',
      features: [
        'Read and organize emails',
        'Create folders and rules',
        'Draft automated responses',
        'Access Office 365 integration'
      ],
      comingSoon: false // Set to true if not ready yet
    }
  ];

  const handleProviderClick = (provider) => {
    if (provider.comingSoon || isLoading) return;
    
    setSelectedProvider(provider.id);
    if (onProviderSelect) {
      onProviderSelect(provider.id);
    }
  };

  return (
    <div className="oauth-provider-selection">
      <div className="provider-selection-header">
        <h3>Choose Your Email Provider</h3>
        <p>Connect your email account to enable automated email management</p>
      </div>

      <div className="providers-grid">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''} ${
              provider.comingSoon ? 'coming-soon' : ''
            } ${isLoading ? 'loading' : ''}`}
            onClick={() => handleProviderClick(provider)}
            style={{ '--provider-color': provider.color }}
          >
            {provider.comingSoon && (
              <div className="coming-soon-badge">Coming Soon</div>
            )}
            
            <div className="provider-icon">
              {provider.icon}
            </div>
            
            <div className="provider-info">
              <h4>{provider.displayName}</h4>
              <p className="provider-description">{provider.description}</p>
              
              <ul className="provider-features">
                {provider.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="provider-action">
              {isLoading && selectedProvider === provider.id ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <button 
                  className="connect-button"
                  disabled={provider.comingSoon || isLoading}
                >
                  {provider.comingSoon ? 'Coming Soon' : `Connect ${provider.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="provider-selection-footer">
        <div className="security-note">
          <span className="security-icon">🔒</span>
          <div>
            <strong>Your data is secure</strong>
            <p>We use industry-standard OAuth 2.0 authentication. We never store your email password.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthProviderSelection;

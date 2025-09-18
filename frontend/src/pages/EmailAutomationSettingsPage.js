import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EmailAutomationSettings from '../components/EmailAutomationSettings';
import { useAuth } from '../contexts/AuthContext';

const EmailAutomationSettingsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Validate clientId parameter
    if (!clientId) {
      navigate('/dashboard');
      return;
    }

    setLoading(false);
  }, [isAuthenticated, clientId, navigate]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="back-button"
        >
          ← Back to Dashboard
        </button>
        <div className="page-title">
          <h1>Email Automation Settings</h1>
          <p>Client ID: {clientId}</p>
        </div>
      </div>

      <div className="page-content">
        <EmailAutomationSettings clientId={clientId} />
      </div>

      <style jsx="true">{`
        .page-container {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .page-header {
          background: white;
          border-bottom: 1px solid #e9ecef;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-button {
          padding: 0.5rem 1rem;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }

        .back-button:hover {
          background: #5a6268;
        }

        .page-title h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .page-title p {
          margin: 0.25rem 0 0 0;
          color: #666;
          font-size: 0.9rem;
        }

        .page-content {
          padding: 0;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          gap: 1rem;
        }

        .loading-spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .back-button {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default EmailAutomationSettingsPage;

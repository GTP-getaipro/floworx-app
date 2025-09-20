import React, { useState, useEffect } from 'react';
import './GmailConnectionStatus.css';

/**
 * GmailConnectionStatus - Gmail Integration Status Display Component
 *
 * Displays the current status of Gmail API connection with real-time
 * monitoring, error handling, and connection management actions.
 *
 * @component
 * @example
 * // Full status display with actions
 * <GmailConnectionStatus
 *   showActions={true}
 *   onStatusChange={handleStatusChange}
 * />
 *
 * // Compact status indicator
 * <GmailConnectionStatus
 *   compact={true}
 *   showActions={false}
 * />
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.showActions=true] - Whether to show connection actions
 * @param {boolean} [props.compact=false] - Whether to use compact display mode
 * @param {Function} [props.onStatusChange] - Callback when status changes
 *
 * @features
 * - Real-time connection status monitoring (30-second intervals)
 * - Visual status indicators with icons and colors
 * - Connection management actions (connect, disconnect, refresh)
 * - Error handling with user-friendly messages
 * - Loading states during API operations
 * - Compact mode for space-constrained layouts
 * - Token-based authentication validation
 * - Automatic status updates and notifications
 *
 * @dependencies
 * - Lucide React: Icons for status display
 * - CSS: GmailConnectionStatus.css for styling
 * - localStorage: Token storage and validation
 * - Gmail API: Connection status and management endpoints
 */
const GmailConnectionStatus = ({
  showActions = true,
  compact = false,
  onStatusChange = null
}) => {
  const [status, setStatus] = useState({
    loading: true,
    connected: false,
    connection: null,
    error: null
  });

  useEffect(() => {
    checkConnectionStatus();
    
    // Set up periodic status checks (every 30 seconds)
    const interval = setInterval(checkConnectionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus({
          loading: false,
          connected: false,
          connection: null,
          error: 'Not authenticated'
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
        
        const newStatus = {
          loading: false,
          connected: Boolean(gmailConnection) && gmailConnection.status === 'active',
          connection: gmailConnection,
          error: null
        };

        setStatus(newStatus);
        
        // Notify parent component of status change
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        throw new Error('Failed to check connection status');
      }
    } catch (error) {
      console.error('Connection status check failed:', error);
      const errorStatus = {
        loading: false,
        connected: false,
        connection: null,
        error: error.message
      };
      
      setStatus(errorStatus);
      
      if (onStatusChange) {
        onStatusChange(errorStatus);
      }
    }
  };

  const refreshConnection = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
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
        await checkConnectionStatus();
      } else {
        throw new Error('Failed to refresh connection');
      }
    } catch (error) {
      console.error('Connection refresh failed:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const getStatusIcon = () => {
    if (status.loading) {
      return <RefreshCw className="status-icon loading spin" />;
    }
    
    if (status.connected) {
      return <CheckCircle className="status-icon connected" />;
    }
    
    if (status.error) {
      return <AlertCircle className="status-icon error" />;
    }
    
    return <Mail className="status-icon disconnected" />;
  };

  const getStatusText = () => {
    if (status.loading) {
      return 'Checking connection...';
    }
    
    if (status.connected) {
      return 'Gmail Connected';
    }
    
    if (status.error) {
      return 'Connection Error';
    }
    
    return 'Gmail Not Connected';
  };

  const getStatusDetails = () => {
    if (status.loading) {
      return 'Verifying Gmail connection status';
    }
    
    if (status.connected && status.connection) {
      const connection = status.connection;
      const expiryDate = connection.expiryDate ? new Date(connection.expiryDate) : null;
      const isExpiringSoon = expiryDate && (expiryDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // 24 hours
      
      if (isExpiringSoon) {
        return `Connection expires ${expiryDate.toLocaleDateString()}`;
      }
      
      return 'Gmail automation is active and working';
    }
    
    if (status.error) {
      return status.error;
    }
    
    return 'Connect your Gmail account to enable email automation';
  };

  const isExpiringSoon = () => {
    if (!status.connected || !status.connection?.expiryDate) return false;
    const expiryDate = new Date(status.connection.expiryDate);
    return (expiryDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // 24 hours
  };

  if (compact) {
    return (
      <div className={`gmail-status-compact ${status.connected ? 'connected' : 'disconnected'}`}>
        {getStatusIcon()}
        <span className="status-text">{getStatusText()}</span>
        {showActions && status.connected && isExpiringSoon() && (
          <button 
            className="refresh-btn-compact"
            onClick={refreshConnection}
            disabled={status.loading}
            title="Refresh connection"
          >
            <RefreshCw className={`refresh-icon ${status.loading ? 'spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="gmail-connection-status">
      <div className="status-header">
        {getStatusIcon()}
        <div className="status-info">
          <h3 className="status-title">{getStatusText()}</h3>
          <p className="status-details">{getStatusDetails()}</p>
        </div>
      </div>

      {status.connected && status.connection && (
        <div className="connection-details">
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-${status.connection.status}`}>
              {status.connection.status}
            </span>
          </div>
          
          {status.connection.expiryDate && (
            <div className="detail-item">
              <span className="detail-label">Expires:</span>
              <span className={`detail-value ${isExpiringSoon() ? 'expiring-soon' : ''}`}>
                {new Date(status.connection.expiryDate).toLocaleDateString()}
                {isExpiringSoon() && <Clock className="expiry-icon" />}
              </span>
            </div>
          )}
        </div>
      )}

      {showActions && (status.connected || status.error) && (
        <div className="status-actions">
          {status.connected && (
            <button 
              className="action-btn refresh"
              onClick={refreshConnection}
              disabled={status.loading}
            >
              <RefreshCw className={`btn-icon ${status.loading ? 'spin' : ''}`} />
              Refresh
            </button>
          )}
          
          {status.error && (
            <button 
              className="action-btn retry"
              onClick={checkConnectionStatus}
              disabled={status.loading}
            >
              <RefreshCw className={`btn-icon ${status.loading ? 'spin' : ''}`} />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GmailConnectionStatus;

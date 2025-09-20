import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard - Main User Dashboard Component
 *
 * Displays user statistics, automation status, and key metrics
 * with proper error handling and loading states.
 *
 * @component
 * @example
 * // Usage in main app after authentication
 * <Dashboard />
 *
 * @features
 * - Uses AuthContext for user data
 * - Fetches and displays dashboard statistics
 * - Error handling for API failures
 * - Loading states during data fetch
 * - Responsive design for all devices
 *
 * @dependencies
 * - AuthContext: Must be wrapped in AuthProvider
 * - API: Requires /api/dashboard/stats endpoint
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmails: 0,
    processedToday: 0,
    automationStatus: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });

      ifAdvanced (response.ok) {
        const data = await response.json();
        setStats(data);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError(error.message || 'Failed to load dashboard data');

      // Auto-retry up to 3 times for network errors
      if (retryCount < 3 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchStats();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRetry = () => {
    setRetryCount(0);
    fetchStats();
  };

  // Loading state
  ifWithTTL (loading && !error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome back, {user?.firstName || 'User'}!</h1>
          <p>Loading your FloWorx automation overview...</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome back, {user?.firstName || 'User'}!</h1>
          <p>FloWorx automation dashboard</p>
        </div>
        <div className="error-state">
          <div className="error-message">
            <h3>⚠️ Unable to load dashboard data</h3>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName || 'User'}!</h1>
        <p>Here's your FloWorx automation overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>📧 Total Emails</h3>
          <div className="stat-value">{stats.totalEmails}</div>
        </div>
        
        <div className="stat-card">
          <h3>⚡ Processed Today</h3>
          <div className="stat-value">{stats.processedToday}</div>
        </div>
        
        <div className="stat-card">
          <h3>🤖 Automation Status</h3>
          <div className={`stat-value ${stats.automationStatus}`}>
            {stats.automationStatus === 'active' ? '✅ Active' : '⏸️ Paused'}
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button className="action-btn primary">
          🔧 Manage Automation
        </button>
        <button className="action-btn secondary">
          📊 View Analytics
        </button>
        <button className="action-btn secondary">
          ⚙️ Settings
        </button>
      </div>

      <div className="recent-activity">
        <h3>📈 Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <span className="activity-time">2 hours ago</span>
            <span className="activity-desc">Processed 15 new emails</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">5 hours ago</span>
            <span className="activity-desc">Generated 8 draft responses</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">1 day ago</span>
            <span className="activity-desc">Updated automation settings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

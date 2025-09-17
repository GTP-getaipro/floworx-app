import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmails: 0,
    processedToday: 0,
    automationStatus: 'active'
  });

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

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

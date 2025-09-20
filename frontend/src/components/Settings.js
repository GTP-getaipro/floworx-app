import React, { useState, useEffect } from 'react';

/**
 * Settings - User Settings Management Component
 *
 * Allows users to configure automation settings, notifications,
 * and business preferences with proper error handling.
 *
 * @component
 * @example
 * // Usage in settings page
 * <Settings />
 *
 * @features
 * - Fetches and updates user settings
 * - Toggle switches for boolean settings
 * - Form inputs for numeric/text settings
 * - Error handling for API failures
 * - Loading states during operations
 * - Auto-save functionality
 *
 * @dependencies
 * - API: Requires /api/user/settings endpoints
 */
const Settings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    automationEnabled: true,
    processingInterval: 5,
    maxEmailsPerBatch: 50,
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setFetchLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch settings`);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setError(error.message || 'Failed to load settings');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBusinessHoursChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>⚙️ Settings</h1>
          <p>Configure your FloWorx automation preferences</p>
        </div>

        <div className="settings-sections">
          <section className="settings-section">
            <h3>🔔 Notifications</h3>
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                />
                <span className="toggle-slider" />
                Email Notifications
              </label>
              <p className="setting-description">
                Receive email updates about automation status and results
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>🤖 Automation</h3>
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={settings.automationEnabled}
                  onChange={() => handleToggle('automationEnabled')}
                />
                <span className="toggle-slider" />
                Enable Automation
              </label>
              <p className="setting-description">
                Automatically process and respond to emails
              </p>
            </div>

            <div className="setting-item">
              <label htmlFor="processingInterval">Processing Interval (minutes)</label>
              <input
                type="number"
                id="processingInterval"
                name="processingInterval"
                value={settings.processingInterval}
                onChange={handleInputChange}
                min="1"
                max="60"
              />
              <p className="setting-description">
                How often to check for new emails
              </p>
            </div>

            <div className="setting-item">
              <label htmlFor="maxEmailsPerBatch">Max Emails Per Batch</label>
              <input
                type="number"
                id="maxEmailsPerBatch"
                name="maxEmailsPerBatch"
                value={settings.maxEmailsPerBatch}
                onChange={handleInputChange}
                min="10"
                max="200"
              />
              <p className="setting-description">
                Maximum number of emails to process at once
              </p>
            </div>
          </section>

          <section className="settings-section">
            <h3>🕒 Business Hours</h3>
            <div className="business-hours">
              <div className="time-input">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="time"
                  id="startTime"
                  value={settings.businessHours.start}
                  onChange={(e) => handleBusinessHoursChange('start', e.target.value)}
                />
              </div>
              
              <div className="time-input">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  value={settings.businessHours.end}
                  onChange={(e) => handleBusinessHoursChange('end', e.target.value)}
                />
              </div>
              
              <div className="timezone-input">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  value={settings.businessHours.timezone}
                  onChange={(e) => handleBusinessHoursChange('timezone', e.target.value)}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
            <p className="setting-description">
              Automation will only run during business hours
            </p>
          </section>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="settings-actions">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="btn primary"
          >
            {loading ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      <style>{`
        .settings {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .settings-header {
          margin-bottom: 2rem;
        }

        .settings-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .settings-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .settings-section h3 {
          margin-bottom: 1rem;
          color: #333;
        }

        .setting-item {
          margin-bottom: 1.5rem;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
        }

        .toggle-slider {
          width: 50px;
          height: 24px;
          background: #ccc;
          border-radius: 12px;
          margin-right: 0.5rem;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-slider::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }

        input[type="checkbox"]:checked + .toggle-slider {
          background: #667eea;
        }

        input[type="checkbox"]:checked + .toggle-slider::after {
          transform: translateX(26px);
        }

        input[type="checkbox"] {
          display: none;
        }

        .setting-description {
          color: #666;
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }

        .business-hours {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }

        .time-input, .timezone-input {
          display: flex;
          flex-direction: column;
        }

        .time-input label, .timezone-input label {
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        input, select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .message {
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn.primary {
          background: #667eea;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .business-hours {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;

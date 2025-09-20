import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserManagement.css';

/**
 * UserManagement - User Profile Management Component
 *
 * Allows authenticated users to view and update their profile information.
 *
 * @component
 * @example
 * // Usage in a dashboard or settings page
 * <UserManagement />
 *
 * @features
 * - Uses AuthContext for user data (no props required)
 * - Profile editing with form validation
 * - API integration for profile updates
 * - Loading states and error handling
 *
 * @dependencies
 * - AuthContext: Must be wrapped in AuthProvider
 * - CSS: Requires UserManagement.css for styling
 */

const UserManagement = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    businessType: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        businessType: user.businessType || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage('Profile updated successfully!');

        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
          setMessage('');
        }, 3000);
      } else {
        setError(data.message || `HTTP ${response.status}: Failed to update profile`);
        setMessage(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Network error occurred');
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management">
      <div className="user-management-container">
        <div className="user-management-header">
          <h1>👤 User Profile</h1>
          <p>Manage your account information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={profile.email}
              onChange={handleInputChange}
              required
              disabled
            />
            <small className="form-help">Email cannot be changed</small>
          </div>

          <div className="form-group">
            <label htmlFor="businessType">Business Type</label>
            <select
              id="businessType"
              name="businessType"
              value={profile.businessType}
              onChange={handleInputChange}
            >
              <option value="">Select Business Type</option>
              <option value="hot-tub">Hot Tub Services</option>
              <option value="hvac">HVAC Services</option>
              <option value="electrical">Electrical Services</option>
              <option value="plumbing">Plumbing Services</option>
              <option value="general-contractor">General Contractor</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading}
              className="btn primary"
            >
              {loading ? '⏳ Updating...' : '💾 Save Changes'}
            </button>
          </div>
        </form>

        <div className="account-actions">
          <h3>🔧 Account Actions</h3>
          <div className="action-buttons">
            <button className="btn secondary">
              🔑 Change Password
            </button>
            <button className="btn secondary">
              📧 Update Email Preferences
            </button>
            <button className="btn danger">
              🗑️ Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * Step4Team - Team and Supplier Configuration Onboarding Step
 *
 * Final configuration step where users set up their team members,
 * suppliers, and notification preferences for the FloWorx platform.
 *
 * @component
 * @example
 * // Usage in onboarding router
 * <Route path="/onboarding/step4" element={<Step4Team />} />
 *
 * @features
 * - Team member management with roles (owner, admin, user)
 * - Supplier contact configuration
 * - Notification preferences (email, SMS)
 * - Dynamic form fields for adding/removing team members
 * - Form validation and error handling
 * - Loading states during configuration save
 * - Form state persistence across sessions
 * - Progress tracking in onboarding flow
 *
 * @dependencies
 * - React Router: useNavigate for step progression
 * - API: Team configuration and onboarding endpoints
 *
 * @configuration
 * - team: Array of team members with email and role
 * - suppliers: Array of supplier contacts
 * - notifications: Email and SMS notification preferences
 *
 * @note Final step before onboarding completion
 */
export default function Step4Team() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    team: [{ email: '', role: 'owner' }],
    suppliers: [],
    notifications: {
      email: true,
      sms: false
    }
  });

  useEffect(() => {
    // Load current onboarding state
    const loadState = async () => {
      try {
        const response = await api('/api/onboarding');
        if (response.data) {
          setFormData(prev => ({ ...prev, ...response.data }));
        }
      } catch (err) {
        console.error('Failed to load onboarding state:', err);
      }
    };
    loadState();
  }, []);

  const handleTeamChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const addTeamMember = () => {
    if (formData.team.length < 5) {
      setFormData(prev => ({
        ...prev,
        team: [...prev.team, { email: '', role: 'staff' }]
      }));
    }
  };

  const removeTeamMember = (index) => {
    if (formData.team.length > 1) {
      setFormData(prev => ({
        ...prev,
        team: prev.team.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSupplierChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map((supplier, i) => 
        i === index ? value : supplier
      )
    }));
  };

  const addSupplier = () => {
    if (formData.suppliers.length < 10) {
      setFormData(prev => ({
        ...prev,
        suppliers: [...prev.suppliers, '']
      }));
    }
  };

  const removeSupplier = (index) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter((_, i) => i !== index)
    }));
  };

  const handleNotificationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api('/api/onboarding', {
        method: 'PUT',
        body: {
          step: 4,
          patch: formData
        }
      });
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err.message || 'Failed to save team setup');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/step3');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Team & Notifications
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step 4 of 4 - Set up your team and notification preferences
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Team Members */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Team Members (1-5 required)
              </h3>
              <div className="space-y-3">
                {formData.team.map((member, index) => (
                  <div key={index} className="flex space-x-3 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={member.email}
                        onChange={(e) => handleTeamChange(index, 'email', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={member.role}
                        onChange={(e) => handleTeamChange(index, 'role', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                    {formData.team.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formData.team.length < 5 && (
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Add Team Member
                </button>
              )}
            </div>

            {/* Suppliers */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Suppliers (Optional, max 10)
              </h3>
              <div className="space-y-2">
                {formData.suppliers.map((supplier, index) => (
                  <div key={index} className="flex space-x-3 items-center">
                    <input
                      type="text"
                      placeholder="Supplier name or email"
                      value={supplier}
                      onChange={(e) => handleSupplierChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSupplier(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              {formData.suppliers.length < 10 && (
                <button
                  type="button"
                  onClick={addSupplier}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Add Supplier
                </button>
              )}
            </div>

            {/* Notifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    checked={formData.notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                    Email notifications for new categorized emails
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="smsNotifications"
                    type="checkbox"
                    checked={formData.notifications.sms}
                    onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-900">
                    SMS notifications for urgent emails (coming soon)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

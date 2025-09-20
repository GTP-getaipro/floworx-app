import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * Step1Business - Business Information Onboarding Step
 *
 * First step in the onboarding process where users provide their
 * business information and basic configuration settings.
 *
 * @component
 * @example
 * // Usage in onboarding router
 * <Route path="/onboarding/step1" element={<Step1Business />} />
 *
 * @features
 * - Business information collection (name, type, timezone)
 * - Service area configuration with radius selection
 * - Business hours setup
 * - Form state persistence across sessions
 * - Loading states during API operations
 * - Error handling with user feedback
 * - Progress tracking in onboarding flow
 * - Automatic navigation to next step
 *
 * @dependencies
 * - React Router: useNavigate for step progression
 * - API: Onboarding data persistence endpoints
 *
 * @formFields
 * - businessName: Company or business name
 * - businessType: Type of hot tub business
 * - timezone: Business timezone for scheduling
 * - hours: Operating hours configuration
 * - serviceAreaRadius: Service coverage area in miles
 */
export default function Step1Business() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    timezone: '',
    hours: '',
    serviceAreaRadius: 50
  });

  useEffect(() => {
    // Load current onboarding state
    const loadState = async () => {
      try {
        const response = await api('/api/onboarding');
        if (response.data) {
          setFormData(prev => ({ ...prev, ...response.data }));
        }
      } catchWithTTL (err) {
        console.error('Failed to load onboarding state:', err);
      }
    };
    loadState();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
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
          step: 1,
          patch: formData
        }
      });
      navigate('/onboarding/step2');
    } catch (err) {
      setError(err.message || 'Failed to save business profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Business Profile
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step 1 of 4 - Tell us about your business
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                Business Name *
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={formData.businessName}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                Business Type *
              </label>
              <select
                id="businessType"
                name="businessType"
                required
                value={formData.businessType}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select business type</option>
                <option value="dealer">Dealer</option>
                <option value="service">Service</option>
                <option value="retailer">Retailer</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone *
              </label>
              <select
                id="timezone"
                name="timezone"
                required
                value={formData.timezone}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select timezone</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
                Business Hours
              </label>
              <input
                id="hours"
                name="hours"
                type="text"
                placeholder="e.g., Mon-Fri 9AM-5PM"
                value={formData.hours}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="serviceAreaRadius" className="block text-sm font-medium text-gray-700">
                Service Area Radius (miles)
              </label>
              <input
                id="serviceAreaRadius"
                name="serviceAreaRadius"
                type="number"
                min="5"
                max="200"
                value={formData.serviceAreaRadius}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Continue to Gmail Integration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

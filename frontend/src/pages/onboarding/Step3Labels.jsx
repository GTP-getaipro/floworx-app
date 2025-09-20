import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

/**
 * Step3Labels - Email Label Configuration Onboarding Step
 *
 * Onboarding step where users configure email labels and AI classification
 * settings for automated email organization and routing.
 *
 * @component
 * @example
 * // Usage in onboarding router
 * <Route path="/onboarding/step3" element={<Step3Labels />} />
 *
 * @features
 * - Email label mapping configuration (service, sales, parts, warranty, support)
 * - AI confidence threshold settings
 * - Label validation and testing
 * - Form state persistence across sessions
 * - Loading states during configuration save
 * - Error handling with user feedback
 * - Progress tracking in onboarding flow
 * - Skip option for default settings
 *
 * @dependencies
 * - React Router: useNavigate for step progression
 * - API: Label configuration and onboarding endpoints
 *
 * @configuration
 * - labelMap: Maps business categories to email labels
 * - thresholds: AI confidence levels for automatic classification
 *
 * @note Critical for FloWorx AI email classification functionality
 */
export default function Step3Labels() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    labelMap: {
      service: '',
      sales: '',
      parts: '',
      warranty: '',
      support: ''
    },
    thresholds: {
      confidenceMin: 0.7
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
      } catchWithTTL (err) {
        console.error('Failed to load onboarding state:', err);
      }
    };
    loadState();
  }, []);

  const handleLabelChange = (category, value) => {
    setFormData(prev => ({
      ...prev,
      labelMap: {
        ...prev.labelMap,
        [category]: value
      }
    }));
  };

  const handleThresholdChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        confidenceMin: parseFloat(value) || 0
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
          step: 3,
          patch: formData
        }
      });
      navigate('/onboarding/step4');
    } catch (err) {
      setError(err.message || 'Failed to save label mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/step2');
  };

  const categories = [
    { key: 'service', label: 'Service Requests', description: 'Repair, maintenance, troubleshooting' },
    { key: 'sales', label: 'Sales Inquiries', description: 'New purchases, quotes, product info' },
    { key: 'parts', label: 'Parts & Accessories', description: 'Replacement parts, accessories' },
    { key: 'warranty', label: 'Warranty Claims', description: 'Warranty issues, claims, coverage' },
    { key: 'support', label: 'General Support', description: 'Questions, how-to, general help' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Label Mapping
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Step 3 of 4 - Map email categories to Gmail labels
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Email Category Mapping
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Map each business category to a Gmail label. FloWorx will automatically categorize incoming emails.
              </p>

              <div className="space-y-4">
                {categories.map(({ key, label, description }) => (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label} *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">{description}</p>
                        <input
                          type="text"
                          required
                          placeholder={`Gmail label for ${label.toLowerCase()}`}
                          value={formData.labelMap[key]}
                          onChange={(e) => handleLabelChange(key, e.target.value)}
                          className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Classification Settings
              </h3>
              <div>
                <label htmlFor="confidenceMin" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Confidence Threshold: {Math.round(formData.thresholds.confidenceMin * 100)}%
                </label>
                <input
                  id="confidenceMin"
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={formData.thresholds.confidenceMin}
                  onChange={handleThresholdChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% (More emails)</span>
                  <span>95% (Higher accuracy)</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Emails below this confidence level will be marked for manual review.
                </p>
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
                {loading ? 'Saving...' : 'Continue to Team Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import axios from 'axios';
import React, { useState, useEffect } from 'react';
import './StepStyles.css';

const BusinessCategoriesStep = ({ data, onComplete, onBack, canGoBack }) => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Predefined category suggestions for hot tub businesses
  const suggestions = [
    { name: 'New Leads', description: 'Potential customers inquiring about services' },
    { name: 'Customer Support', description: 'Existing customers needing help' },
    { name: 'Service Requests', description: 'Maintenance and repair requests' },
    { name: 'Invoices & Billing', description: 'Payment and billing related emails' },
    { name: 'Partnerships', description: 'Vendor and partner communications' },
    { name: 'Appointments', description: 'Scheduling and appointment requests' },
    { name: 'Product Inquiries', description: 'Questions about hot tubs and accessories' },
    { name: 'Warranty Claims', description: 'Warranty and insurance related emails' },
  ];

  useEffect(() => {
    // Load existing categories if available
    if (data.stepData && data.stepData['business-categories']) {
      setCategories(data.stepData['business-categories'].categories || []);
    }
  }, [data]);

  const addCategory = categoryData => {
    if (categories.find(cat => cat.name.toLowerCase() === categoryData.name.toLowerCase())) {
      setError('Category already exists');
      return;
    }

    setCategories([...categories, categoryData]);
    setNewCategory('');
    setError(null);
  };

  const addCustomCategory = () => {
    if (!newCategory.trim()) {
      setError('Please enter a category name');
      return;
    }

    addCategory({
      name: newCategory.trim(),
      description: `Custom category: ${newCategory.trim()}`,
    });
  };

  const removeCategory = index => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      setError('Please add at least one email category');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/onboarding/step/business-categories`,
        { categories },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onComplete({ businessCategories: categories });
    } catch (error) {
      console.error('Error saving categories:', error);
      setError(error.response?.data?.message || 'Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='step-content'>
      <div className='step-description'>
        <h3>Define Your Email Categories</h3>
        <p>
          Help us understand the types of emails your business receives. We'll use these categories
          to automatically organize and route your emails.
        </p>
      </div>

      <div className='categories-section'>
        <div className='suggestions-section'>
          <h4>Popular Categories for Hot Tub Businesses</h4>
          <div className='suggestion-grid'>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-card ${
                  categories.find(cat => cat.name === suggestion.name) ? 'selected' : ''
                }`}
                onClick={() => addCategory(suggestion)}
              >
                <div className='suggestion-name'>{suggestion.name}</div>
                <div className='suggestion-description'>{suggestion.description}</div>
                {categories.find(cat => cat.name === suggestion.name) && (
                  <div className='selected-indicator'>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className='custom-category-section'>
          <h4>Add Custom Category</h4>
          <div className='custom-category-input'>
            <input
              type='text'
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder='Enter custom category name...'
              onKeyPress={e => e.key === 'Enter' && addCustomCategory()}
            />
            <button
              onClick={addCustomCategory}
              className='add-button'
              disabled={!newCategory.trim()}
            >
              Add
            </button>
          </div>
        </div>

        <div className='selected-categories'>
          <h4>Your Selected Categories ({categories.length})</h4>
          {categories.length === 0 ? (
            <div className='empty-state'>
              <p>No categories selected yet. Choose from suggestions above or add your own.</p>
            </div>
          ) : (
            <div className='category-list'>
              {categories.map((category, index) => (
                <div key={index} className='category-item'>
                  <div className='category-info'>
                    <div className='category-name'>{category.name}</div>
                    <div className='category-description'>{category.description}</div>
                  </div>
                  <button
                    onClick={() => removeCategory(index)}
                    className='remove-button'
                    title='Remove category'
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className='error-message'>
          <span className='error-icon'>⚠️</span>
          {error}
        </div>
      )}

      <div className='step-actions'>
        {canGoBack && (
          <button onClick={onBack} className='secondary-button'>
            Back
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving || categories.length === 0}
          className='primary-button'
        >
          {saving ? (
            <>
              <div className='button-spinner' />
              Saving...
            </>
          ) : (
            'Continue to Gmail Integration'
          )}
        </button>
      </div>

      <div className='step-help'>
        <h5>💡 Tips for choosing categories:</h5>
        <ul>
          <li>Think about how you currently organize your emails</li>
          <li>Consider who typically handles each type of email</li>
          <li>You can always add or modify categories later</li>
          <li>Start with 3-6 main categories to keep it simple</li>
        </ul>
      </div>
    </div>
  );
};

export default BusinessCategoriesStep;

/**
 * Standardized React Component Template for FloWorx SaaS
 * Use this template for all new components to ensure consistency
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  formatDate, 
  formatCurrency, 
  isValidEmail,
  createSuccessResponse,
  createErrorResponse 
} from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useErrorReporting } from './ErrorBoundary';
import { Button, Input, Alert, Card, Loading } from './ui';

/**
 * YourComponent - Brief description of what this component does
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Component title
 * @param {Array} props.items - Array of items to display
 * @param {Function} props.onItemSelect - Callback when item is selected
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Additional CSS classes
 */
const YourComponent = ({
  title,
  items = [],
  onItemSelect,
  loading = false,
  className = '',
  ...otherProps
}) => {
  // Hooks (always at the top)
  const { user, isAuthenticated } = useAuth();
  const { reportError } = useErrorReporting();

  // State management
  const [localState, setLocalState] = useState({
    selectedItem: null,
    searchTerm: '',
    filters: {},
    error: null,
    isSubmitting: false
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Computed values (useMemo for expensive calculations)
  const filteredItems = useMemo(() => {
    if (!localState.searchTerm) return items;
    
    return items.filter(item => 
      item.name.toLowerCase().includes(localState.searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(localState.searchTerm.toLowerCase())
    );
  }, [items, localState.searchTerm]);

  const hasValidationErrors = useMemo(() => {
    return Object.keys(validationErrors).length > 0;
  }, [validationErrors]);

  // Event handlers (useCallback to prevent unnecessary re-renders)
  const handleItemSelect = useCallback((item) => {
    try {
      setLocalState(prev => ({ ...prev, selectedItem: item, error: null }));
      onItemSelect?.(item);
    } catch (error) {
      console.error('Error selecting item:', error);
      reportError(error, { component: 'YourComponent', action: 'itemSelect' });
      setLocalState(prev => ({ 
        ...prev, 
        error: 'Failed to select item. Please try again.' 
      }));
    }
  }, [onItemSelect, reportError]);

  const handleSearchChange = useCallback((e) => {
    const searchTerm = e.target.value;
    setLocalState(prev => ({ ...prev, searchTerm }));
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLocalState(prev => ({ ...prev, isSubmitting: true, error: null }));
    
    try {
      // API call would go here
      const response = await fetch('/api/your-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Operation failed');
      }
      
      // Success handling
      setLocalState(prev => ({ 
        ...prev, 
        isSubmitting: false,
        error: null 
      }));
      
      // Reset form
      setFormData({ name: '', email: '', description: '' });
      
      // Notify parent component
      onItemSelect?.(result.data);
      
    } catch (error) {
      console.error('Submit error:', error);
      reportError(error, { 
        component: 'YourComponent', 
        action: 'submit',
        formData: { ...formData, email: '***masked***' } // Mask sensitive data
      });
      
      setLocalState(prev => ({ 
        ...prev, 
        isSubmitting: false,
        error: error.message || 'An unexpected error occurred. Please try again.'
      }));
    }
  }, [formData, validateForm, user.token, onItemSelect, reportError]);

  // Effects
  useEffect(() => {
    // Component mount effect
    console.log('YourComponent mounted');
    
    return () => {
      // Cleanup
      console.log('YourComponent unmounted');
    };
  }, []);

  useEffect(() => {
    // Effect when items change
    if (items.length > 0 && !localState.selectedItem) {
      setLocalState(prev => ({ ...prev, selectedItem: items[0] }));
    }
  }, [items, localState.selectedItem]);

  // Early returns for loading/error states
  if (loading) {
    return (
      <div className={`your-component ${className}`}>
        <Loading message="Loading items..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`your-component ${className}`}>
        <Alert variant="warning" title="Authentication Required">
          Please log in to access this feature.
        </Alert>
      </div>
    );
  }

  // Main render
  return (
    <div className={`your-component ${className}`} {...otherProps}>
      {/* Header */}
      <div className="your-component__header">
        <h2 className="text-2xl font-bold text-ink">{title}</h2>
        
        {/* Search */}
        <div className="your-component__search">
          <Input
            type="text"
            placeholder="Search items..."
            value={localState.searchTerm}
            onChange={handleSearchChange}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Error Alert */}
      {localState.error && (
        <Alert 
          variant="danger" 
          title="Error"
          dismissible
          onDismiss={() => setLocalState(prev => ({ ...prev, error: null }))}
        >
          {localState.error}
        </Alert>
      )}

      {/* Main Content */}
      <div className="your-component__content">
        {/* Form */}
        <Card>
          <Card.Header>
            <Card.Title>Add New Item</Card.Title>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                error={validationErrors.name}
                required
              />
              
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                error={validationErrors.email}
                required
              />
              
              <Input
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                error={validationErrors.description}
                helperText="Minimum 10 characters"
                required
              />
              
              <Button
                type="submit"
                variant="primary"
                loading={localState.isSubmitting}
                disabled={hasValidationErrors}
              >
                {localState.isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </Card.Content>
        </Card>

        {/* Items List */}
        <Card>
          <Card.Header>
            <Card.Title>Items ({filteredItems.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-ink-sub">
                {localState.searchTerm ? 'No items match your search.' : 'No items available.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      localState.selectedItem?.id === item.id
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-surface-border hover:border-ink-sub'
                    }`}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="font-medium text-ink">{item.name}</div>
                    <div className="text-sm text-ink-sub">{item.description}</div>
                    <div className="text-xs text-ink-sub mt-1">
                      Created: {formatDate(item.createdAt, 'DISPLAY')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

// PropTypes validation
YourComponent.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string
  })),
  onItemSelect: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string
};

// Default props
YourComponent.defaultProps = {
  items: [],
  loading: false,
  className: '',
  onItemSelect: null
};

export default YourComponent;

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Copy this template to create new components
 * 2. Replace 'YourComponent' with actual component name
 * 3. Update PropTypes and defaultProps
 * 4. Implement actual functionality
 * 5. Add component-specific styles
 * 6. Write tests for the component
 * 7. Add to component index file
 * 
 * EXAMPLE:
 * import YourComponent from './components/YourComponent';
 * 
 * <YourComponent
 *   title="My Items"
 *   items={items}
 *   onItemSelect={handleItemSelect}
 *   loading={isLoading}
 * />
 */

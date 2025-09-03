import axios from 'axios';
import React, { useState, useEffect } from 'react';

import { Button, Alert, Card, Badge } from '../ui';

const BusinessTypeStep = ({ onNext, onBack, stepData, onStepDataChange }) => {
  const [businessTypes, setBusinessTypes] = useState([]);
  const [selectedBusinessType, setSelectedBusinessType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load existing selection from step data
  useEffect(() => {
    if (stepData?.businessTypeId) {
      setSelectedBusinessType(stepData.businessTypeId);
    }
  }, [stepData]);

  // Fetch available business types
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        setIsLoading(true);
        setError('');

        const response = await axios.get('/api/business-types');

        if (response.data.success) {
          setBusinessTypes(response.data.data);
        } else {
          throw new Error('Failed to load business types');
        }
      } catch (err) {
        console.error('Error fetching business types:', err);
        setError(
          err.response?.data?.message ||
            'Failed to load business types. Please refresh and try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessTypes();
  }, []);

  const handleBusinessTypeSelect = businessType => {
    setSelectedBusinessType(businessType.id);
    setError('');

    // Update step data immediately for UI feedback
    onStepDataChange('business-type', {
      businessTypeId: businessType.id,
      businessTypeName: businessType.name,
      businessTypeSlug: businessType.slug,
      defaultCategories: businessType.default_categories,
    });
  };

  const handleContinue = async () => {
    if (!selectedBusinessType) {
      setError('Please select your business type to continue');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Save business type selection to backend
      const response = await axios.post(
        '/api/business-types/select',
        {
          businessTypeId: selectedBusinessType,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        // Update step data with server response
        onStepDataChange('business-type', {
          ...stepData,
          businessTypeId: selectedBusinessType,
          businessTypeName: response.data.data.businessType.name,
          businessTypeSlug: response.data.data.businessType.slug,
          defaultCategories: response.data.data.businessType.defaultCategories,
          savedAt: new Date().toISOString(),
        });

        // Proceed to next step
        onNext();
      } else {
        throw new Error(response.data.message || 'Failed to save business type');
      }
    } catch (err) {
      console.error('Error saving business type:', err);
      setError(
        err.response?.data?.message ||
          'Failed to save your business type selection. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center mb-8'>
          <h2 className='text-2xl font-bold text-ink mb-2'>Select Your Business Type</h2>
          <p className='text-ink-sub'>
            We'll customize your email automation based on your industry.
          </p>
        </div>

        <Card className='text-center py-12'>
          <div className='flex flex-col items-center space-y-4'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary' />
            <p className='text-ink-sub'>Loading business types...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && businessTypes.length === 0) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center mb-8'>
          <h2 className='text-2xl font-bold text-ink mb-2'>Select Your Business Type</h2>
          <p className='text-ink-sub'>
            We'll customize your email automation based on your industry.
          </p>
        </div>

        <Card className='text-center py-12'>
          <Alert variant='danger' className='mb-6'>
            {error}
          </Alert>
          <Button onClick={() => window.location.reload()} variant='primary'>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const selectedType = businessTypes.find(type => type.id === selectedBusinessType);

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className='text-center mb-8'>
        <h2 className='text-2xl font-bold text-ink mb-2'>Select Your Business Type</h2>
        <p className='text-ink-sub'>
          We'll customize your email automation workflows based on your industry's specific needs.
        </p>
      </div>

      <div className='space-y-6'>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-1'>
          {businessTypes.map(businessType => (
            <Card
              key={businessType.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedBusinessType === businessType.id
                  ? 'ring-2 ring-brand-primary border-brand-primary bg-brand-primary-50'
                  : 'hover:border-brand-primary-200'
              }`}
              onClick={() => handleBusinessTypeSelect(businessType)}
            >
              <div className='flex items-start space-x-4'>
                <div className='flex-shrink-0'>
                  <div className='w-12 h-12 bg-brand-primary-100 rounded-lg flex items-center justify-center text-2xl'>
                    {businessType.slug === 'hot-tub-spa' ? '🛁' : '🏢'}
                  </div>
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-lg font-semibold text-ink'>{businessType.name}</h3>
                    {selectedBusinessType === businessType.id && (
                      <div className='flex-shrink-0 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center'>
                        <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  <p className='text-ink-sub mt-1 text-sm'>{businessType.description}</p>

                  {businessType.default_categories &&
                    businessType.default_categories.length > 0 && (
                      <div className='mt-4'>
                        <h4 className='text-sm font-medium text-ink mb-2'>Email Categories:</h4>
                        <div className='flex flex-wrap gap-2'>
                          {businessType.default_categories.slice(0, 3).map((category, index) => (
                            <Badge
                              key={index}
                              variant={
                                category.priority === 'high'
                                  ? 'danger'
                                  : category.priority === 'medium'
                                    ? 'warning'
                                    : 'default'
                              }
                              size='sm'
                            >
                              {category.name}
                            </Badge>
                          ))}
                          {businessType.default_categories.length > 3 && (
                            <Badge variant='default' size='sm'>
                              +{businessType.default_categories.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {selectedType && (
          <Alert variant='success' title={`Selected: ${selectedType.name}`}>
            Your email automation will be optimized for {selectedType.name.toLowerCase()}
            with specialized workflows for your industry's unique requirements.
          </Alert>
        )}

        {error && (
          <Alert variant='danger' className='mt-6'>
            {error}
          </Alert>
        )}
      </div>

      <div className='flex justify-between items-center mt-8 pt-6 border-t border-surface-border'>
        <Button type='button' onClick={onBack} variant='secondary' disabled={isSubmitting}>
          Back
        </Button>

        <Button
          type='button'
          onClick={handleContinue}
          variant='primary'
          disabled={!selectedBusinessType || isSubmitting}
          loading={isSubmitting}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default BusinessTypeStep;

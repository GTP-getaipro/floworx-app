import React, { useState } from 'react';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ChangeEmailStep = ({ recoveryData, onComplete, onError }) => {
  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.newEmail) {
      newErrors.newEmail = 'New email address is required';
    } else if (!emailRegex.test(formData.newEmail)) {
      newErrors.newEmail = 'Please enter a valid email address';
    } else if (formData.newEmail.toLowerCase() === recoveryData.email.toLowerCase()) {
      newErrors.newEmail = 'New email must be different from current email';
    }

    // Confirm email validation
    if (!formData.confirmEmail) {
      newErrors.confirmEmail = 'Please confirm your new email address';
    } else if (formData.newEmail !== formData.confirmEmail) {
      newErrors.confirmEmail = 'Email addresses do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({ newEmail: formData.newEmail });
    } catch (error) {
      onError('Failed to update email address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='w-16 h-16 bg-brand-primary-50 rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg
            className='w-8 h-8 text-brand-primary'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-ink mb-2'>Update Email Address</h3>
        <p className='text-ink-sub'>
          Current email: <span className='font-medium'>{recoveryData.email}</span>
        </p>
      </div>

      <Alert variant='info'>
        <strong>Important:</strong> After updating your email address, you'll need to verify the new
        email before you can use it to log in.
      </Alert>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='New Email Address'
          type='email'
          name='newEmail'
          value={formData.newEmail}
          onChange={handleChange}
          error={errors.newEmail}
          placeholder='Enter your new email address'
          required
        />

        <Input
          label='Confirm New Email Address'
          type='email'
          name='confirmEmail'
          value={formData.confirmEmail}
          onChange={handleChange}
          error={errors.confirmEmail}
          placeholder='Confirm your new email address'
          required
        />

        <div className='flex justify-end space-x-3 pt-4'>
          <Button
            type='submit'
            variant='primary'
            loading={isSubmitting}
            disabled={!formData.newEmail || !formData.confirmEmail}
          >
            Update Email Address
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangeEmailStep;

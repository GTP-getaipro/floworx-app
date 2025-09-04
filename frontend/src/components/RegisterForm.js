import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import useApiRequest from '../hooks/useApiRequest';
import useFormValidation, { commonValidationRules } from '../hooks/useFormValidation';

import { Button, Input, Alert, Card, Link } from './ui';

const validationRules = {
  email: [commonValidationRules.required, commonValidationRules.email],
  password: [
    commonValidationRules.required,
    commonValidationRules.minLength(8),
    value => {
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumbers = /\d/.test(value);
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      return '';
    },
  ],
  confirmPassword: [
    commonValidationRules.required,
    commonValidationRules.match('password', 'Passwords do not match'),
  ],
  firstName: [commonValidationRules.required],
  lastName: [commonValidationRules.required],
  companyName: [], // Optional field
};

const RegisterForm = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const _api = useApiRequest();
  const [submitResult, setSubmitResult] = useState(null);

  const {
    values: formData,
    errors,
    isSubmitting: loading,
    handleChange,
    handleBlur,
    handleSubmit,
  } = useFormValidation(
    {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      companyName: '',
    },
    validationRules,
    {
      validateOnChange: false,
      validateOnBlur: true,
    }
  );

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegistration = async values => {
    try {
      const result = await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        businessName: values.companyName,
        agreeToTerms: true,
        marketingConsent: false
      });

      if (result.success) {
        const successResult = {
          success: true,
          requiresVerification: result.requiresVerification,
          email: values.email,
        };
        
        setSubmitResult(successResult);

        if (!result.requiresVerification) {
          // Auto-redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }

        return successResult;
      }

      throw new Error(result.error || 'Registration failed');
    } catch (error) {
      throw new Error('An unexpected error occurred. Please try again.');
    }
  };

  const { success, requiresVerification, email } = submitResult || {};

  if (success) {
    return (
      <div className='max-w-md w-full'>
        <Card>
          <Alert variant='success' title='Registration Successful! ✅'>
            {requiresVerification ? (
              <div className='space-y-4'>
                <p>Your account has been created successfully!</p>
                <p>
                  <strong>Please check your email to verify your account.</strong>
                </p>
                <p>
                  We've sent a verification link to <strong>{email}</strong>
                </p>
                <div className='mt-4 p-4 bg-surface-subtle rounded-lg'>
                  <p className='font-medium text-ink mb-2'>Didn't receive the email?</p>
                  <ul className='list-disc list-inside space-y-1 text-sm text-ink-sub'>
                    <li>Check your spam/junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes and check again</li>
                  </ul>
                  <div className='mt-3'>
                    <Link to='/verify-email' variant='primary'>
                      Need to resend verification email?
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p>Your account has been created successfully.</p>
                <p>Redirecting to your dashboard...</p>
              </div>
            )}
          </Alert>
        </Card>
      </div>
    );
  }


  return (
    <div className='max-w-md w-full space-y-8'>
      <div className='text-center'>
        <h2 className='text-3xl font-bold text-ink'>Create Your Floworx Account</h2>
        <p className='mt-2 text-ink-sub'>Start automating your workflow today</p>
      </div>

      <Card className='mt-8'>
        {errors.submit && (
          <Alert variant='danger' className='mb-6'>
            {errors.submit}
          </Alert>
        )}

        <form onSubmit={e => handleSubmit(handleRegistration, e)} className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <Input
              label='First Name'
              type='text'
              name='firstName'
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.firstName}
              placeholder='Your first name'
              disabled={loading}
              required
            />

            <Input
              label='Last Name'
              type='text'
              name='lastName'
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.lastName}
              placeholder='Your last name'
              disabled={loading}
              required
            />
          </div>

          <Input
            label='Company Name'
            type='text'
            name='companyName'
            value={formData.companyName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.companyName}
            placeholder='Your company name (optional)'
            disabled={loading}
          />

          <Input
            label='Email Address'
            type='email'
            name='email'
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            placeholder='Enter your business email'
            required
            disabled={loading}
          />

          <Input
            label='Password'
            type='password'
            name='password'
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            placeholder='Create a password (min. 8 characters)'
            required
            disabled={loading}
            helperText='Password must be at least 8 characters long'
          />

          <Input
            label='Confirm Password'
            type='password'
            name='confirmPassword'
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.confirmPassword}
            placeholder='Confirm your password'
            required
            disabled={loading}
          />

          <Button type='submit' variant='primary' size='lg' loading={loading} className='w-full'>
            Create Account
          </Button>
        </form>

        <div className='mt-6 text-center'>
          <p className='text-ink-sub'>
            Already have an account?{' '}
            <Link to='/login' variant='primary'>
              Sign in here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );

};

export default RegisterForm;

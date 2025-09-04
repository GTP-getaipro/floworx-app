import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useApiRequest from '../hooks/useApiRequest';
import useFormValidation, { commonValidationRules } from '../hooks/useFormValidation';
import useFormPersistence from '../hooks/useFormPersistence';
import ValidatedInput from './ui/ValidatedInput';
import ProtectedButton from './ui/ProtectedButton';
import ProgressIndicator from './ui/ProgressIndicator';

import { Alert, Card, Link } from './ui';

const validationRules = {
  email: [commonValidationRules.required, commonValidationRules.email],
  password: [
    commonValidationRules.required,
    commonValidationRules.minLength(8),
    value => {
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumbers = /\d/.test(value);
      const hasSpecialChar = /[@$!%*?&]/.test(value);
      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
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
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();
  const [submitResult, setSubmitResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Form persistence
  const {
    values: persistedValues,
    isLoaded: persistenceLoaded,
    handleChange: handlePersistenceChange,
    handleSubmitSuccess,
    hasPersistedData,
    clearPersistedData,
  } = useFormPersistence(
    'registration',
    {
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
    },
    {
      excludeFields: ['password', 'confirmPassword'], // Don't persist sensitive data
      storage: 'sessionStorage',
      debounceMs: 300,
    }
  );

  // Registration steps for progress indicator
  const registrationSteps = [
    { title: 'Personal Info', description: 'Name and company' },
    { title: 'Account Details', description: 'Email and password' },
    { title: 'Verification', description: 'Complete setup' },
  ];

  const {
    values: formData,
    errors,
    isSubmitting: loading,
    handleChange: originalHandleChange,
    handleBlur,
    handleSubmit,
    setValues,
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

  // Update form values when persistence is loaded
  useEffect(() => {
    console.log('🔍 Persistence effect triggered:', { persistenceLoaded, persistedValues });
    if (persistenceLoaded && Object.keys(persistedValues).length > 0) {
      console.log('🔄 Updating form with persisted values:', persistedValues);
      setValues(prev => ({
        ...prev,
        email: persistedValues.email || prev.email,
        firstName: persistedValues.firstName || prev.firstName,
        lastName: persistedValues.lastName || prev.lastName,
        companyName: persistedValues.companyName || prev.companyName,
        // Never restore passwords
        password: '',
        confirmPassword: '',
      }));
    }
  }, [persistenceLoaded, persistedValues, setValues]);

  // Enhanced change handler with persistence
  const handleChange = e => {
    originalHandleChange(e);
    handlePersistenceChange(e);

    // Update progress based on form completion
    const { name, value } = e.target;
    updateProgress(name, value);
  };

  // Progress tracking
  const updateProgress = (fieldName, fieldValue) => {
    const personalInfoFields = ['firstName', 'lastName', 'companyName'];
    const accountFields = ['email', 'password', 'confirmPassword'];

    const personalComplete = personalInfoFields.every(field =>
      field === fieldName ? fieldValue : formData[field]
    );

    const accountComplete = accountFields.every(field =>
      field === fieldName ? fieldValue : formData[field]
    );

    if (accountComplete) {
      setCurrentStep(2);
    } else if (personalComplete) {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show notification for persisted data
  useEffect(() => {
    if (persistenceLoaded && hasPersistedData) {
      showInfo(
        '📝 We restored your previous form data. You can continue where you left off or clear it to start fresh.'
      );
    }
  }, [persistenceLoaded, hasPersistedData, showInfo]);

  const handleRegistration = async values => {
    try {
      console.log('🚀 Starting registration with data:', {
        ...values,
        password: '[HIDDEN]',
      });

      // Show processing feedback
      showInfo('Creating your account...');
      setCurrentStep(2); // Move to verification step

      const result = await register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        companyName: values.companyName,
        agreeToTerms: true,
        marketingConsent: false,
      });

      console.log('📊 Registration result:', result);

      if (result.success) {
        const successResult = {
          success: true,
          requiresVerification: result.requiresVerification,
          email: values.email,
        };

        setSubmitResult(successResult);

        // Clear persisted data on success
        handleSubmitSuccess();

        // Show enhanced success toast with next steps
        showSuccess(
          result.requiresVerification
            ? '🎉 Account created! Please check your email to verify your account and complete setup.'
            : '🎉 Account created successfully! Redirecting to your dashboard...'
        );

        if (!result.requiresVerification) {
          // Auto-redirect to dashboard after 3 seconds with countdown
          let countdown = 3;
          const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
              showInfo(`Redirecting to dashboard in ${countdown} seconds...`);
            } else {
              clearInterval(countdownInterval);
              navigate('/dashboard');
            }
          }, 1000);
        }

        return successResult;
      }

      // Show detailed error feedback
      const errorMessage = result.error || 'Registration failed. Please try again.';
      showError(`❌ ${errorMessage}`);

      // Reset progress on error
      setCurrentStep(1);

      throw new Error(result.error || 'Registration failed');
    } catch (error) {
      console.error('❌ Registration error:', error);

      // Show user-friendly error message
      if (!error.message.includes('Registration failed')) {
        showError('❌ An unexpected error occurred. Please check your connection and try again.');
      }

      // Reset progress on error
      setCurrentStep(1);

      throw error;
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
        {/* Progress Indicator */}
        <div className='mb-6'>
          <ProgressIndicator steps={registrationSteps} currentStep={currentStep} size='sm' />
        </div>

        {/* Persisted Data Notification */}
        {hasPersistedData && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <svg className='w-4 h-4 text-blue-400 mr-2' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                    clipRule='evenodd'
                  />
                </svg>
                <span className='text-sm text-blue-800'>Previous data restored</span>
              </div>
              <button
                type='button'
                onClick={clearPersistedData}
                className='text-xs text-blue-600 hover:text-blue-800 underline'
              >
                Clear & Start Fresh
              </button>
            </div>
          </div>
        )}

        {errors.submit && (
          <Alert variant='danger' className='mb-6'>
            {errors.submit}
          </Alert>
        )}

        <form onSubmit={e => handleSubmit(handleRegistration, e)} className='space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <ValidatedInput
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
              minLength={2}
              maxLength={50}
              autoComplete='given-name'
              validationRules={{ required: true, minLength: 2, maxLength: 50 }}
              realTimeValidation
            />

            <ValidatedInput
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
              minLength={2}
              maxLength={50}
              autoComplete='family-name'
              validationRules={{ required: true, minLength: 2, maxLength: 50 }}
              realTimeValidation
            />
          </div>

          <ValidatedInput
            label='Company Name'
            type='text'
            name='companyName'
            value={formData.companyName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.companyName}
            placeholder='Your company name (optional)'
            disabled={loading}
            maxLength={100}
            autoComplete='organization'
            validationRules={{ maxLength: 100 }}
            realTimeValidation
          />

          <ValidatedInput
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
            maxLength={255}
            autoComplete='email'
            validationRules={{ required: true, maxLength: 255 }}
            realTimeValidation
          />

          <ValidatedInput
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
            helperText='Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)'
            minLength={8}
            maxLength={128}
            autoComplete='new-password'
            validationRules={{ required: true, minLength: 8, maxLength: 128 }}
            realTimeValidation
          />

          <ValidatedInput
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
            minLength={8}
            maxLength={128}
            autoComplete='new-password'
            validationRules={{ required: true, minLength: 8, maxLength: 128 }}
            realTimeValidation
          />

          <ProtectedButton
            type='submit'
            variant='primary'
            size='lg'
            disabled={loading}
            className='w-full'
            debounceMs={1000}
            showLoadingState
            loadingText='Creating Account...'
            onClick={() => {}} // Will be handled by form onSubmit
            forceLoading={loading} // Pass form loading state to button
          >
            Create Account
          </ProtectedButton>
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

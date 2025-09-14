import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';

import ChangeEmailStep from './ChangeEmailStep';
import EmergencyAccessStep from './EmergencyAccessStep';
import ResetPasswordStep from './ResetPasswordStep';
import SelectActionsStep from './SelectActionsStep';

const AccountRecoveryDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [recoveryData, setRecoveryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [recoveryActions, setRecoveryActions] = useState({});

  const token = searchParams.get('token');
  const recoveryType = searchParams.get('type');

  const recoverySteps = {
    email_change: [
      { id: 'verify', title: 'Verify Identity', description: 'Confirm your identity' },
      { id: 'change_email', title: 'Update Email', description: 'Enter your new email address' },
      { id: 'complete', title: 'Complete', description: 'Recovery completed' },
    ],
    account_recovery: [
      { id: 'verify', title: 'Verify Identity', description: 'Confirm your identity' },
      { id: 'select_actions', title: 'Recovery Options', description: 'Choose recovery actions' },
      { id: 'reset_password', title: 'Reset Password', description: 'Set new password' },
      { id: 'complete', title: 'Complete', description: 'Recovery completed' },
    ],
    emergency_access: [
      { id: 'verify', title: 'Verify Identity', description: 'Confirm your identity' },
      {
        id: 'emergency_access',
        title: 'Emergency Access',
        description: 'Temporary account access',
      },
      { id: 'complete', title: 'Complete', description: 'Access granted' },
    ],
  };

  const verifyRecoveryToken = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/recovery/verify-token`, {
        token,
      });

      if (response.data.success) {
        setRecoveryData(response.data.data);
        setCurrentStep(0);
      } else {
        setError(response.data.message || 'Invalid or expired recovery token.');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setError(error.response?.data?.message || 'Failed to verify recovery token.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !recoveryType) {
      setError('Invalid recovery link. Please request a new recovery link.');
      setLoading(false);
      return;
    }

    verifyRecoveryToken();
  }, [token, recoveryType, verifyRecoveryToken]);

  const handleStepComplete = async stepData => {
    const steps = recoverySteps[recoveryType];
    const currentStepData = steps[currentStep];

    try {
      switch (currentStepData.id) {
        case 'verify':
          // Identity verification completed
          setCurrentStep(currentStep + 1);
          break;

        case 'change_email':
          setRecoveryActions({ ...recoveryActions, newEmail: stepData.newEmail });
          await completeRecovery({ newEmail: stepData.newEmail });
          break;

        case 'select_actions':
          setRecoveryActions({ ...recoveryActions, ...stepData });
          setCurrentStep(currentStep + 1);
          break;

        case 'reset_password':
          setRecoveryActions({ ...recoveryActions, newPassword: stepData.newPassword });
          await completeRecovery({ ...recoveryActions, newPassword: stepData.newPassword });
          break;

        case 'emergency_access':
          await completeRecovery({ emergencyAccess: true });
          break;

        default:
          setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      setError('Failed to complete recovery step. Please try again.');
    }
  };

  const completeRecovery = async actions => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/recovery/complete`, {
        token,
        recoveryActions: actions,
      });

      if (response.data.success) {
        setCurrentStep(recoverySteps[recoveryType].length - 1);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', {
            state: {
              message:
                'Account recovery completed successfully. Please log in with your new credentials.',
            },
          });
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to complete recovery');
      }
    } catch (error) {
      console.error('Recovery completion error:', error);
      setError('Failed to complete account recovery. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-surface-soft flex items-center justify-center'>
        <Card className='w-full max-w-md'>
          <Card.Content className='text-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4' />
            <p className='text-ink-sub'>Verifying recovery token...</p>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-surface-soft flex items-center justify-center'>
        <Card className='w-full max-w-md'>
          <Card.Content className='text-center py-8'>
            <Alert variant='danger' className='mb-6'>
              {error}
            </Alert>
            <Button onClick={() => navigate('/forgot-password')} variant='primary'>
              Request New Recovery Link
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  const steps = recoverySteps[recoveryType];
  const currentStepData = steps[currentStep];

  return (
    <div className='min-h-screen bg-surface-soft'>
      <div className='bg-surface border-b border-surface-border'>
        <div className='max-w-4xl mx-auto px-6 py-6'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-ink mb-2'>Account Recovery</h1>
            <p className='text-ink-sub'>
              {recoveryType === 'email_change' && 'Update your email address'}
              {recoveryType === 'account_recovery' && 'Recover your account access'}
              {recoveryType === 'emergency_access' && 'Emergency account access'}
            </p>
          </div>

          <div className='mt-8'>
            <ProgressBar
              value={currentStep + 1}
              max={steps.length}
              variant='primary'
              showLabel
              className='mb-4'
            />
            <div className='flex justify-between text-sm text-ink-sub'>
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center space-y-1 ${
                    index <= currentStep ? 'text-brand-primary' : 'text-ink-sub'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      index < currentStep
                        ? 'bg-brand-primary text-white'
                        : index === currentStep
                          ? 'bg-brand-primary text-white'
                          : 'bg-surface-border text-ink-sub'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span className='text-xs text-center max-w-20'>{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-2xl mx-auto px-6 py-8'>
        <Card>
          <Card.Header>
            <Card.Title>{currentStepData.title}</Card.Title>
            <Card.Description>{currentStepData.description}</Card.Description>
          </Card.Header>
          <Card.Content>
            <RecoveryStepComponent
              stepId={currentStepData.id}
              recoveryType={recoveryType}
              recoveryData={recoveryData}
              onComplete={handleStepComplete}
              onError={setError}
            />
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

// Individual step components
const RecoveryStepComponent = ({ stepId, recoveryType, recoveryData, onComplete, onError }) => {
  switch (stepId) {
    case 'verify':
      return <VerifyIdentityStep recoveryData={recoveryData} onComplete={onComplete} />;
    case 'change_email':
      return (
        <ChangeEmailStep recoveryData={recoveryData} onComplete={onComplete} onError={onError} />
      );
    case 'select_actions':
      return <SelectActionsStep recoveryData={recoveryData} onComplete={onComplete} />;
    case 'reset_password':
      return (
        <ResetPasswordStep recoveryData={recoveryData} onComplete={onComplete} onError={onError} />
      );
    case 'emergency_access':
      return <EmergencyAccessStep recoveryData={recoveryData} onComplete={onComplete} />;
    case 'complete':
      return <CompleteStep recoveryType={recoveryType} />;
    default:
      return <div>Unknown step</div>;
  }
};

// Placeholder components - will be implemented separately
const VerifyIdentityStep = ({ recoveryData, onComplete }) => (
  <div className='text-center py-8'>
    <div className='mb-6'>
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
            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
      </div>
      <h3 className='text-lg font-semibold text-ink mb-2'>Identity Verified</h3>
      <p className='text-ink-sub'>
        Hello {recoveryData.firstName}, we've verified your identity using the recovery link sent to
        your email.
      </p>
    </div>
    <Button onClick={() => onComplete({})} variant='primary'>
      Continue Recovery
    </Button>
  </div>
);

const CompleteStep = ({ recoveryType }) => (
  <div className='text-center py-8'>
    <div className='w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4'>
      <svg className='w-8 h-8 text-success' fill='currentColor' viewBox='0 0 20 20'>
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
          clipRule='evenodd'
        />
      </svg>
    </div>
    <h3 className='text-lg font-semibold text-ink mb-2'>Recovery Complete!</h3>
    <p className='text-ink-sub mb-6'>
      Your account recovery has been completed successfully. You will be redirected to the login
      page shortly.
    </p>
    <div className='animate-pulse text-sm text-ink-sub'>Redirecting in 3 seconds...</div>
  </div>
);

export default AccountRecoveryDashboard;

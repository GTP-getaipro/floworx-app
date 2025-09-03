import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

import useAnalytics from '../hooks/useAnalytics';

import ErrorBoundary, { useErrorReporting } from './ErrorBoundary';

// Step components
import BusinessCategoriesStep from './onboarding/BusinessCategoriesStep';
import BusinessTypeStep from './onboarding/BusinessTypeStep';
import CompletionStep from './onboarding/CompletionStep';
import LabelMappingStep from './onboarding/LabelMappingStep';
import ReviewStep from './onboarding/ReviewStep';
import TeamSetupStep from './onboarding/TeamSetupStep';
import WelcomeStep from './onboarding/WelcomeStep';
import { ProgressBar, Alert } from './ui';
import WorkflowDeployment from './WorkflowDeployment';

const OnboardingWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    googleConnected: false,
    businessCategories: [],
    labelMappings: [],
    teamMembers: [],
    completedSteps: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [recoveryInfo, setRecoveryInfo] = useState(null);
  const { reportError } = useErrorReporting();
  const {
    trackOnboardingStart,
    trackStepStart,
    trackStepCompletion,
    trackStepFailure,
    trackOnboardingCompletion,
    trackPageView,
  } = useAnalytics();

  const steps = useMemo(
    () => [
      {
        id: 'welcome',
        title: 'Welcome to Floworx',
        component: WelcomeStep,
        description: "Let's get your email automation set up",
      },
      {
        id: 'business-type',
        title: 'Business Type',
        component: BusinessTypeStep,
        description: 'Select your business type for customized workflows',
      },
      {
        id: 'business-categories',
        title: 'Email Categories',
        component: BusinessCategoriesStep,
        description: 'Define your main email categories',
      },
      {
        id: 'label-mapping',
        title: 'Gmail Integration',
        component: LabelMappingStep,
        description: 'Map categories to Gmail labels',
      },
      {
        id: 'team-setup',
        title: 'Team Notifications',
        component: TeamSetupStep,
        description: 'Configure team member notifications',
      },
      {
        id: 'review',
        title: 'Review & Activate',
        component: ReviewStep,
        description: 'Review your configuration',
      },
      {
        id: 'workflow-deployment',
        title: 'Deploying Automation',
        component: WorkflowDeployment,
        description: 'Setting up your email automation',
      },
      {
        id: 'completion',
        title: 'All Set!',
        component: CompletionStep,
        description: 'Your automation is now active',
      },
    ],
    []
  );

  const fetchOnboardingStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // First, check for recovery information
      try {
        const recoveryResponse = await axios.get(
          `${process.env.REACT_APP_API_URL}/recovery/session`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (recoveryResponse.data.success) {
          setRecoveryInfo(recoveryResponse.data.recovery);
        }
      } catch (recoveryError) {
        console.warn('Could not fetch recovery info:', recoveryError);
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const { user, googleConnected, completedSteps, stepData, nextStep } = response.data;

      setOnboardingData({
        ...onboardingData,
        googleConnected,
        completedSteps,
        stepData,
        user,
      });

      // Determine current step based on progress
      let newCurrentStep;
      if (nextStep === 'completed') {
        newCurrentStep = steps.length - 1; // Completion step
      } else if (nextStep === 'google-connection') {
        newCurrentStep = 0; // Welcome step
      } else {
        const stepIndex = steps.findIndex(step => step.id === nextStep);
        newCurrentStep = stepIndex > 0 ? stepIndex : 1;
      }

      setCurrentStep(newCurrentStep);

      // Track current step start
      const currentStepId = steps[newCurrentStep]?.id;
      if (currentStepId) {
        trackStepStart(currentStepId);
      }
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
      await reportError(error, { context: 'fetchOnboardingStatus' });
      setError('Failed to load onboarding status');
    } finally {
      setLoading(false);
    }
  }, [onboardingData, steps, trackStepStart, reportError]);

  useEffect(() => {
    // Track onboarding start
    trackOnboardingStart('dashboard', window.location.href);
    trackPageView('onboarding_wizard');

    fetchOnboardingStatus();
  }, [trackOnboardingStart, trackPageView, fetchOnboardingStatus]);

  const handleStepComplete = async (stepId, data) => {
    try {
      // Track step completion
      await trackStepCompletion(stepId, data);

      setOnboardingData(prev => ({
        ...prev,
        [stepId]: data,
        completedSteps: [...prev.completedSteps, stepId],
      }));

      // Save progress to localStorage for recovery
      localStorage.setItem(
        'onboardingProgress',
        JSON.stringify({
          currentStep: currentStep + 1,
          completedSteps: [...onboardingData.completedSteps, stepId],
          stepData: { ...onboardingData.stepData, [stepId]: data },
          timestamp: new Date().toISOString(),
        })
      );

      // Move to next step
      if (currentStep < steps.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);

        // Track next step start
        const nextStepId = steps[nextStep]?.id;
        if (nextStepId) {
          trackStepStart(nextStepId);
        }
      } else {
        // Onboarding complete
        await trackOnboardingCompletion({
          workflowDeployed: stepId === 'workflow-deployment',
          totalSteps: steps.length,
          completedSteps: onboardingData.completedSteps.length + 1,
        });
        onComplete && onComplete();
      }
    } catch (error) {
      console.error('Error completing step:', error);

      // Track step failure
      await trackStepFailure(stepId, error.message, {
        stepData: data,
        currentStep,
        error: error.stack,
      });

      await reportError(error, {
        context: 'handleStepComplete',
        stepId,
        currentStep,
      });
      setError('Failed to save step data');
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  if (loading) {
    return (
      <div className='onboarding-loading'>
        <div className='loading-spinner' />
        <p>Loading your onboarding progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='onboarding-error'>
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button onClick={fetchOnboardingStatus} className='retry-button'>
          Try Again
        </button>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;
  const currentStepData = steps[currentStep];

  const handleRecovery = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/recovery/resume`,
        {
          fromStep: recoveryInfo.lastSuccessfulStep,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refresh the onboarding status
      await fetchOnboardingStatus();
    } catch (error) {
      console.error('Recovery failed:', error);
      await reportError(error, { context: 'handleRecovery' });
      setError('Recovery failed. Please try again.');
    }
  };

  return (
    <ErrorBoundary context={{ currentStep }}>
      <div className='min-h-screen bg-surface-soft'>
        {recoveryInfo && recoveryInfo.hasRecoveryData && recoveryInfo.recentErrors.length > 0 && (
          <div className='bg-surface border-b border-surface-border'>
            <div className='max-w-4xl mx-auto p-4'>
              <Alert
                variant='info'
                title='We found where you left off!'
                dismissible
                onDismiss={() => setRecoveryInfo(null)}
              >
                <div className='flex items-center justify-between'>
                  <p>You can continue from your last successful step or start fresh.</p>
                  <div className='flex space-x-2 ml-4'>
                    <button
                      onClick={handleRecovery}
                      className='px-3 py-1 bg-brand-primary text-white rounded text-sm hover:bg-brand-primary-hover'
                    >
                      Continue from {recoveryInfo.lastSuccessfulStep}
                    </button>
                  </div>
                </div>
              </Alert>
            </div>
          </div>
        )}

        <div className='bg-surface border-b border-surface-border'>
          <div className='max-w-4xl mx-auto p-6'>
            <div className='mb-6'>
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

        <div className='flex-1 py-8'>
          <div className='max-w-4xl mx-auto px-6'>
            <CurrentStepComponent
              data={onboardingData}
              onComplete={data => handleStepComplete(currentStepData.id, data)}
              onBack={handleStepBack}
              onSkip={handleSkipStep}
              canGoBack={currentStep > 0}
              canSkip={currentStep < steps.length - 2} // Can't skip review or completion
            />
          </div>
        </div>

        <div className='bg-surface border-t border-surface-border'>
          <div className='max-w-4xl mx-auto px-6 py-4'>
            <div className='flex justify-between items-center text-sm'>
              <div className='text-ink-sub'>
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className='text-ink-sub'>
                Need help?{' '}
                <a
                  href='mailto:support@floworx-iq.com'
                  className='text-brand-primary hover:text-brand-primary-hover underline'
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default OnboardingWizard;

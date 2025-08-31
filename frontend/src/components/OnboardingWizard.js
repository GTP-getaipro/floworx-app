import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ErrorBoundary, { useErrorReporting } from './ErrorBoundary';
import WorkflowDeployment from './WorkflowDeployment';
import useAnalytics from '../hooks/useAnalytics';
import './OnboardingWizard.css';

// Step components
import WelcomeStep from './onboarding/WelcomeStep';
import BusinessCategoriesStep from './onboarding/BusinessCategoriesStep';
import LabelMappingStep from './onboarding/LabelMappingStep';
import TeamSetupStep from './onboarding/TeamSetupStep';
import ReviewStep from './onboarding/ReviewStep';
import CompletionStep from './onboarding/CompletionStep';

const OnboardingWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    googleConnected: false,
    businessCategories: [],
    labelMappings: [],
    teamMembers: [],
    completedSteps: []
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
    trackPageView
  } = useAnalytics();

  const steps = useMemo(() => [
    {
      id: 'welcome',
      title: 'Welcome to Floworx',
      component: WelcomeStep,
      description: 'Let\'s get your email automation set up'
    },
    {
      id: 'business-categories',
      title: 'Email Categories',
      component: BusinessCategoriesStep,
      description: 'Define your main email categories'
    },
    {
      id: 'label-mapping',
      title: 'Gmail Integration',
      component: LabelMappingStep,
      description: 'Map categories to Gmail labels'
    },
    {
      id: 'team-setup',
      title: 'Team Notifications',
      component: TeamSetupStep,
      description: 'Configure team member notifications'
    },
    {
      id: 'review',
      title: 'Review & Activate',
      component: ReviewStep,
      description: 'Review your configuration'
    },
    {
      id: 'workflow-deployment',
      title: 'Deploying Automation',
      component: WorkflowDeployment,
      description: 'Setting up your email automation'
    },
    {
      id: 'completion',
      title: 'All Set!',
      component: CompletionStep,
      description: 'Your automation is now active'
    }
  ], []);

  const fetchOnboardingStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // First, check for recovery information
      try {
        const recoveryResponse = await axios.get(`${process.env.REACT_APP_API_URL}/recovery/session`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (recoveryResponse.data.success) {
          setRecoveryInfo(recoveryResponse.data.recovery);
        }
      } catch (recoveryError) {
        console.warn('Could not fetch recovery info:', recoveryError);
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { user, googleConnected, completedSteps, stepData, nextStep } = response.data;

      setOnboardingData({
        ...onboardingData,
        googleConnected,
        completedSteps,
        stepData,
        user
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
        completedSteps: [...prev.completedSteps, stepId]
      }));

      // Save progress to localStorage for recovery
      localStorage.setItem('onboardingProgress', JSON.stringify({
        currentStep: currentStep + 1,
        completedSteps: [...onboardingData.completedSteps, stepId],
        stepData: { ...onboardingData.stepData, [stepId]: data },
        timestamp: new Date().toISOString()
      }));

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
          completedSteps: onboardingData.completedSteps.length + 1
        });
        onComplete && onComplete();
      }
    } catch (error) {
      console.error('Error completing step:', error);

      // Track step failure
      await trackStepFailure(stepId, error.message, {
        stepData: data,
        currentStep,
        error: error.stack
      });

      await reportError(error, {
        context: 'handleStepComplete',
        stepId,
        currentStep
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
      <div className="onboarding-loading">
        <div className="loading-spinner"></div>
        <p>Loading your onboarding progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-error">
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button onClick={fetchOnboardingStatus} className="retry-button">
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
      await axios.post(`${process.env.REACT_APP_API_URL}/recovery/resume`, {
        fromStep: recoveryInfo.lastSuccessfulStep
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      <div className="onboarding-wizard">
        {recoveryInfo && recoveryInfo.hasRecoveryData && recoveryInfo.recentErrors.length > 0 && (
          <div className="recovery-banner">
            <div className="recovery-content">
              <div className="recovery-icon">🔄</div>
              <div className="recovery-text">
                <h4>We found where you left off!</h4>
                <p>You can continue from your last successful step or start fresh.</p>
              </div>
              <div className="recovery-actions">
                <button onClick={handleRecovery} className="recovery-button">
                  Continue from {recoveryInfo.lastSuccessfulStep}
                </button>
                <button onClick={() => setRecoveryInfo(null)} className="dismiss-button">
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="onboarding-header">
          <div className="progress-bar">
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`progress-step ${
                    index <= currentStep ? 'completed' : ''
                  } ${index === currentStep ? 'active' : ''}`}
                >
                  <div className="step-number">{index + 1}</div>
                  <div className="step-title">{step.title}</div>
                </div>
              ))}
            </div>
            <div
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

      <div className="onboarding-content">
        <div className="step-header">
          <h2>{currentStepData.title}</h2>
          <p>{currentStepData.description}</p>
        </div>

        <div className="step-body">
          <CurrentStepComponent
            data={onboardingData}
            onComplete={(data) => handleStepComplete(currentStepData.id, data)}
            onBack={handleStepBack}
            onSkip={handleSkipStep}
            canGoBack={currentStep > 0}
            canSkip={currentStep < steps.length - 2} // Can't skip review or completion
          />
        </div>
      </div>

      <div className="onboarding-footer">
        <div className="step-info">
          Step {currentStep + 1} of {steps.length}
        </div>
        <div className="help-text">
          Need help? <a href="mailto:support@floworx-iq.com">Contact Support</a>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default OnboardingWizard;

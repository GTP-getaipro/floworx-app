import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import BusinessTypeStep from './onboarding/BusinessTypeStep';
import GmailOAuthStep from './onboarding/GmailOAuthStep';
import './OnboardingWizard.css';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    businessType: null,
    gmailConnected: false,
    completedSteps: []
  });

  const steps = [
    {
      id: 'business-type',
      title: 'Select Business Type',
      description: 'Choose your business category for customized workflows',
      component: BusinessTypeStep
    },
    {
      id: 'gmail-oauth',
      title: 'Connect Gmail',
      description: 'Connect your Gmail account for email automation',
      component: GmailOAuthStep
    }
  ];

  // Load onboarding status on mount
  useEffect(() => {
    loadOnboardingStatus();
  }, []);

  const loadOnboardingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/onboarding/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update onboarding data based on backend status
        setOnboardingData(prev => ({
          ...prev,
          businessType: data.businessTypeId,
          gmailConnected: data.googleConnected,
          completedSteps: data.completedSteps || []
        }));

        // Determine current step based on progress
        if (!data.businessTypeId) {
          setCurrentStep(0); // Business type selection
        } else if (!data.googleConnected) {
          setCurrentStep(1); // Gmail OAuth
        } else {
          // All steps complete, redirect to dashboard
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to load onboarding status:', error);
    }
  };

  const handleStepComplete = (stepId, data) => {
    setOnboardingData(prev => ({
      ...prev,
      ...data,
      completedSteps: [...prev.completedSteps, stepId]
    }));

    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps complete
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completedSteps: onboardingData.completedSteps
        })
      });

      if (response.ok) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const CurrentStepComponent = currentStepData.component;

  return (
    <div className="onboarding-wizard">
      <div className="onboarding-container">
        {/* Progress Header */}
        <div className="onboarding-header">
          <div className="progress-bar">
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`progress-step ${
                    index <= currentStep ? 'active' : ''
                  } ${
                    onboardingData.completedSteps.includes(step.id) ? 'completed' : ''
                  }`}
                >
                  <div className="step-indicator">
                    {onboardingData.completedSteps.includes(step.id) ? (
                      <CheckCircle className="step-icon completed" />
                    ) : (
                      <span className="step-number">{index + 1}</span>
                    )}
                  </div>
                  <div className="step-info">
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-description">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="onboarding-content">
          <div className="step-container">
            <CurrentStepComponent
              onNext={handleNext}
              onBack={handleBack}
              onComplete={(data) => handleStepComplete(currentStepData.id, data)}
              data={onboardingData}
              isFirstStep={currentStep === 0}
              isLastStep={currentStep === steps.length - 1}
            />
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="onboarding-footer">
          <div className="step-navigation">
            <button
              className="nav-btn secondary"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="btn-icon" />
              Back
            </button>
            
            <div className="step-indicator-text">
              Step {currentStep + 1} of {steps.length}
            </div>
            
            <button
              className="nav-btn primary"
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
            >
              Next
              <ChevronRight className="btn-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;

import React from 'react';

const ProgressIndicator = ({
  steps = [],
  currentStep = 0,
  variant = 'horizontal',
  size = 'medium',
  showLabels = true,
  className = ''
}) => {
  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const stepSizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  const getStepClasses = (status) => {
    const baseClasses = 'flex items-center justify-center rounded-full border-2 font-medium transition-all duration-200';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-600 border-green-600 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-600 border-blue-600 text-white`;
      default:
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500`;
    }
  };

  const getConnectorClasses = (stepIndex) => {
    const isCompleted = stepIndex < currentStep;
    return `flex-1 h-0.5 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`;
  };

  if (variant === 'vertical') {
    return (
      <div className={`progress-indicator-vertical ${className}`}>
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={index} className="flex items-start mb-4 last:mb-0">
              <div className="flex flex-col items-center mr-4">
                <div className={`${getStepClasses(status)} ${stepSizeClasses[size]}`}>
                  {status === 'completed' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={sizeClasses[size]}>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${index < currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </div>
              {showLabels && (
                <div className="flex-1 pt-1">
                  <div className={`font-medium ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title || step}
                  </div>
                  {step.description && (
                    <div className="text-gray-500 text-sm mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={`progress-indicator-horizontal ${className}`}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`${getStepClasses(status)} ${stepSizeClasses[size]}`}>
                  {status === 'completed' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={sizeClasses[size]}>{index + 1}</span>
                  )}
                </div>
                {showLabels && (
                  <div className="mt-2 text-center">
                    <div className={`font-medium ${sizeClasses[size]} ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title || step}
                    </div>
                    {step.description && (
                      <div className="text-gray-500 text-xs mt-1 max-w-20">
                        {step.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={getConnectorClasses(index)} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;

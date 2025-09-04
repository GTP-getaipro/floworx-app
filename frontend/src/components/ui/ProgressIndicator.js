import React from 'react';

const ProgressIndicator = ({ 
  steps = [], 
  currentStep = 0, 
  showLabels = true,
  variant = 'horizontal', // 'horizontal' or 'vertical'
  size = 'md' // 'sm', 'md', 'lg'
}) => {
  const sizeClasses = {
    sm: { circle: 'w-6 h-6', text: 'text-xs', line: 'h-0.5' },
    md: { circle: 'w-8 h-8', text: 'text-sm', line: 'h-1' },
    lg: { circle: 'w-10 h-10', text: 'text-base', line: 'h-1.5' }
  };

  const classes = sizeClasses[size];

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-green-500';
      case 'current':
        return 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100';
      case 'upcoming':
        return 'bg-gray-200 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-200 text-gray-500 border-gray-300';
    }
  };

  const getLineClasses = (stepIndex) => {
    const isCompleted = stepIndex < currentStep;
    return `${classes.line} ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`;
  };

  if (variant === 'vertical') {
    return (
      <div className="flex flex-col space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  ${classes.circle} rounded-full border-2 flex items-center justify-center font-medium
                  ${getStepClasses(status)}
                  transition-all duration-200
                `}>
                  {status === 'completed' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={classes.text}>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${getLineClasses(index)}`} />
                )}
              </div>
              {showLabels && (
                <div className="ml-4">
                  <p className={`font-medium ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
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
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div className={`
                ${classes.circle} rounded-full border-2 flex items-center justify-center font-medium
                ${getStepClasses(status)}
                transition-all duration-200
              `}>
                {status === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={classes.text}>{index + 1}</span>
                )}
              </div>
              {showLabels && (
                <div className="mt-2 text-center">
                  <p className={`font-medium ${classes.text} ${status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  )}
                </div>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 mx-4 ${getLineClasses(index)}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;

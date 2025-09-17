import React from 'react';

const ProgressIndicator = ({ 
  steps = [], 
  currentStep = 0, 
  className = '',
  ...props 
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`} {...props}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${index <= currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
            }
          `}>
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`
              w-16 h-1 mx-2
              ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
            `} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressIndicator;

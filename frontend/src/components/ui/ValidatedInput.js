import React, { forwardRef } from 'react';
import Input from './Input';

const ValidatedInput = forwardRef(({
  validation,
  error,
  touched,
  showValidation = true,
  ...props
}, ref) => {
  const hasError = touched && error;
  const isValid = touched && !error && showValidation;

  return (
    <div className="validated-input">
      <Input
        ref={ref}
        error={hasError ? error : undefined}
        variant={hasError ? 'error' : isValid ? 'success' : 'default'}
        {...props}
      />
      
      {showValidation && touched && (
        <div className="validation-feedback">
          {hasError ? (
            <div className="error-feedback">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          ) : isValid ? (
            <div className="success-feedback">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Valid
            </div>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .validated-input {
          position: relative;
        }

        .validation-feedback {
          margin-top: 0.25rem;
        }

        .error-feedback {
          display: flex;
          align-items: center;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .success-feedback {
          display: flex;
          align-items: center;
          color: #059669;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
});

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;

import React, { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);
  const [globalError, setGlobalError] = useState(null);

  const addError = useCallback((error, context = {}) => {
    const errorObj = {
      id: Date.now() + Math.random(),
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    setErrors(prev => [...prev, errorObj]);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error added to context:', errorObj);
    }

    return errorObj.id;
  }, []);

  const removeError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const setError = useCallback((error) => {
    setGlobalError(error);
  }, []);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const handleApiError = useCallback((error, context = {}) => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error status
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network error: Unable to connect to server';
    } else {
      // Something else happened
      errorMessage = error.message || errorMessage;
    }

    return addError(errorMessage, { ...context, type: 'api' });
  }, [addError]);

  const handleValidationError = useCallback((validationErrors, context = {}) => {
    const errorMessages = Array.isArray(validationErrors) 
      ? validationErrors.join(', ')
      : validationErrors;
    
    return addError(errorMessages, { ...context, type: 'validation' });
  }, [addError]);

  const value = {
    errors,
    globalError,
    addError,
    removeError,
    clearErrors,
    setError,
    clearGlobalError,
    handleApiError,
    handleValidationError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {globalError && (
        <GlobalErrorDisplay 
          error={globalError} 
          onClose={clearGlobalError} 
        />
      )}
    </ErrorContext.Provider>
  );
};

const GlobalErrorDisplay = ({ error, onClose }) => {
  return (
    <div className="global-error-overlay">
      <div className="global-error-modal">
        <div className="error-header">
          <h3>🚨 Application Error</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="error-content">
          <p>{error.message || error}</p>
          
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="error-stack">
              <summary>Stack Trace (Development)</summary>
              <pre>{error.stack}</pre>
            </details>
          )}
        </div>
        
        <div className="error-actions">
          <button onClick={() => window.location.reload()} className="btn primary">
            Reload Page
          </button>
          <button onClick={onClose} className="btn secondary">
            Dismiss
          </button>
        </div>
      </div>

      <style jsx>{`
        .global-error-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .global-error-modal {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .error-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .error-header h3 {
          margin: 0;
          color: #dc2626;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: #f3f4f6;
        }

        .error-content {
          padding: 1.5rem;
        }

        .error-content p {
          margin: 0 0 1rem 0;
          color: #374151;
          line-height: 1.6;
        }

        .error-stack {
          margin-top: 1rem;
        }

        .error-stack summary {
          cursor: pointer;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .error-stack pre {
          margin-top: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 4px;
          font-size: 0.8rem;
          overflow-x: auto;
          color: #374151;
        }

        .error-actions {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }

        .btn.primary {
          background: #dc2626;
          color: white;
        }

        .btn.primary:hover {
          background: #b91c1c;
        }

        .btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn.secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

import { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext();

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);

  const reportError = useCallback(error => {
    const errorMessage =
      error.response?.data?.message || error.message || 'An unexpected error occurred';

    setErrors(prev => [
      ...prev,
      {
        id: Date.now(),
        message: errorMessage,
        timestamp: new Date(),
      },
    ]);

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement error reporting service
      console.error('Error:', error);
    }
  }, []);

  const dismissError = useCallback(errorId => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, reportError, dismissError, clearErrors }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useErrorReporting = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorContext;

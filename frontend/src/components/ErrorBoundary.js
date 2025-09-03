import axios from 'axios';
import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString(),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
      errorId: Date.now().toString(),
    });

    // Report error to backend for analysis
    this.reportError(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${process.env.REACT_APP_API_URL}/recovery/report-error`,
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            props: this.props.context || {},
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
      isRecovering: false,
    }));
  };

  handleRecovery = async () => {
    this.setState({ isRecovering: true });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get recovery information
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/recovery/session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.recovery.hasRecoveryData) {
        // Resume from last checkpoint
        await axios.post(
          `${process.env.REACT_APP_API_URL}/recovery/resume`,
          {
            fromStep: response.data.recovery.lastSuccessfulStep,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Reset error state and trigger re-render
        this.handleRetry();
      } else {
        throw new Error('No recovery data available');
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      this.setState({
        isRecovering: false,
        error: new Error('Recovery failed: ' + recoveryError.message),
      });
    }
  };

  handleRestart = () => {
    // Clear all local storage and restart
    localStorage.removeItem('onboardingProgress');
    localStorage.removeItem('onboardingSession');

    // Redirect to beginning of onboarding
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount, isRecovering } = this.state;
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;

      return (
        <div className='error-boundary'>
          <div className='error-container'>
            <div className='error-header'>
              <div className='error-icon'>⚠️</div>
              <h2>Oops! Something went wrong</h2>
              <p>We encountered an unexpected error, but don't worry - we can help you recover.</p>
            </div>

            <div className='error-details'>
              <div className='error-summary'>
                <h3>What happened?</h3>
                <p>{error?.message || 'An unexpected error occurred'}</p>

                {retryCount > 0 && (
                  <div className='retry-info'>
                    <small>
                      Retry attempts: {retryCount}/{maxRetries}
                    </small>
                  </div>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className='error-technical'>
                  <summary>Technical Details (Development)</summary>
                  <pre className='error-stack'>
                    {error?.stack}
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className='error-actions'>
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className='retry-button primary'
                  disabled={isRecovering}
                >
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleRecovery}
                className='recovery-button secondary'
                disabled={isRecovering}
              >
                {isRecovering ? (
                  <>
                    <div className='button-spinner' />
                    Recovering...
                  </>
                ) : (
                  'Smart Recovery'
                )}
              </button>

              <button
                onClick={this.handleRestart}
                className='restart-button tertiary'
                disabled={isRecovering}
              >
                Start Over
              </button>
            </div>

            <div className='error-help'>
              <h4>Need additional help?</h4>
              <div className='help-options'>
                <a
                  href='mailto:support@floworx-iq.com?subject=Error Report&body=Error ID: {this.state.errorId}'
                  className='help-link'
                >
                  📧 Contact Support
                </a>
                <a
                  href='https://docs.floworx-iq.com/troubleshooting'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='help-link'
                >
                  📚 View Documentation
                </a>
                <button onClick={() => window.location.reload()} className='help-link refresh-link'>
                  🔄 Refresh Page
                </button>
              </div>

              <div className='error-id'>
                <small>Error ID: {this.state.errorId}</small>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, context = {}) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary context={context}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = async (error, context = {}) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${process.env.REACT_APP_API_URL}/recovery/report-error`,
        {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...context,
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  return { reportError };
};

export default ErrorBoundary;

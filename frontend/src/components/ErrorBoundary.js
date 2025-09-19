import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary - React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * @component
 * @example
 * // Usage wrapping components that might error
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 *
 * @features
 * - Catches and handles React component errors
 * - Displays user-friendly error fallback UI
 * - Logs errors to console and analytics (Google Analytics)
 * - Provides error details in development mode
 * - Allows users to retry after errors
 * - Prevents entire app crashes from component errors
 *
 * @lifecycle
 * - getDerivedStateFromError: Updates state to show fallback UI
 * - componentDidCatch: Logs error details and sends to analytics
 *
 * @dependencies
 * - ErrorBoundary.css: Styling for error UI
 * - Google Analytics: Optional error reporting (window.gtag)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>🚨 Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()}
                className="error-button primary"
              >
                Reload Page
              </button>
              
              <button 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="error-button secondary"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

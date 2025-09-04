import axios from 'axios';
import { useCallback, useEffect, useRef } from 'react';

const useAnalytics = () => {
  const sessionId = useRef(null);
  const stepStartTimes = useRef({});
  const onboardingStartTime = useRef(null);

  // Initialize session ID
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = generateSessionId();
    }
  }, []);

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const getRequestConfig = () => {
    const token = localStorage.getItem('floworx_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Session-ID': sessionId.current,
        'Content-Type': 'application/json',
      },
    };
  };

  /**
   * Track a custom analytics event
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @param {Object} customMetadata - Additional metadata
   */
  const trackEvent = useCallback(async (eventType, eventData = {}, customMetadata = {}) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/track`,
        {
          eventType,
          eventData,
          customMetadata: {
            ...customMetadata,
            url: window.location.href,
            referrer: document.referrer,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          },
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
      // Don't throw error to avoid breaking user experience
    }
  }, []);

  /**
   * Track onboarding start
   * @param {string} source - Traffic source
   * @param {string} referrer - Referrer URL
   */
  const trackOnboardingStart = useCallback(async (source = 'direct', referrer = null) => {
    onboardingStartTime.current = Date.now();

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/onboarding/started`,
        {
          source,
          referrer: referrer || document.referrer,
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Failed to track onboarding start:', error);
    }
  }, []);

  /**
   * Track step start (for duration calculation)
   * @param {string} step - Step name
   */
  const trackStepStart = useCallback(step => {
    stepStartTimes.current[step] = Date.now();
  }, []);

  /**
   * Track step completion
   * @param {string} step - Step name
   * @param {Object} stepData - Step-specific data
   */
  const trackStepCompletion = useCallback(async (step, stepData = {}) => {
    const startTime = stepStartTimes.current[step];
    const duration = startTime ? Date.now() - startTime : 0;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/onboarding/step-completed`,
        {
          step,
          duration,
          stepData: {
            ...stepData,
            completedAt: new Date().toISOString(),
            sessionDuration: onboardingStartTime.current
              ? Date.now() - onboardingStartTime.current
              : 0,
          },
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Failed to track step completion:', error);
    }
  }, []);

  /**
   * Track step failure
   * @param {string} step - Step name
   * @param {string} error - Error message
   * @param {Object} errorContext - Additional error context
   */
  const trackStepFailure = useCallback(async (step, error, errorContext = {}) => {
    const startTime = stepStartTimes.current[step];
    const duration = startTime ? Date.now() - startTime : 0;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/onboarding/step-failed`,
        {
          step,
          error,
          duration,
          errorContext: {
            ...errorContext,
            failedAt: new Date().toISOString(),
            sessionDuration: onboardingStartTime.current
              ? Date.now() - onboardingStartTime.current
              : 0,
          },
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Failed to track step failure:', error);
    }
  }, []);

  /**
   * Track onboarding completion
   * @param {Object} completionData - Completion data
   */
  const trackOnboardingCompletion = useCallback(async (completionData = {}) => {
    const totalDuration = onboardingStartTime.current
      ? Date.now() - onboardingStartTime.current
      : 0;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/onboarding/completed`,
        {
          totalDuration,
          stepsCompleted: Object.keys(stepStartTimes.current).length,
          workflowDeployed: completionData.workflowDeployed || false,
          ...completionData,
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Failed to track onboarding completion:', error);
    }
  }, []);

  /**
   * Track user drop-off
   * @param {string} step - Step where user dropped off
   * @param {string} reason - Reason for drop-off
   */
  const trackDropOff = useCallback(async (step, reason = 'unknown') => {
    const timeSpent = onboardingStartTime.current ? Date.now() - onboardingStartTime.current : 0;

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/analytics/drop-off`,
        {
          step,
          timeSpent,
          reason,
        },
        getRequestConfig()
      );
    } catch (error) {
      console.warn('Failed to track drop-off:', error);
    }
  }, []);

  /**
   * Track page view
   * @param {string} page - Page name
   * @param {Object} pageData - Page-specific data
   */
  const trackPageView = useCallback(
    async (page, pageData = {}) => {
      await trackEvent('page_view', {
        page,
        ...pageData,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent]
  );

  /**
   * Track user interaction
   * @param {string} element - Element interacted with
   * @param {string} action - Action performed
   * @param {Object} interactionData - Interaction data
   */
  const trackInteraction = useCallback(
    async (element, action, interactionData = {}) => {
      await trackEvent('user_interaction', {
        element,
        action,
        ...interactionData,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent]
  );

  /**
   * Track error occurrence
   * @param {string} errorType - Type of error
   * @param {string} errorMessage - Error message
   * @param {Object} errorContext - Error context
   */
  const trackError = useCallback(
    async (errorType, errorMessage, errorContext = {}) => {
      await trackEvent('error_occurred', {
        errorType,
        errorMessage,
        ...errorContext,
        timestamp: new Date().toISOString(),
        stack: errorContext.stack || new Error().stack,
      });
    },
    [trackEvent]
  );

  /**
   * Track performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {Object} context - Metric context
   */
  const trackPerformance = useCallback(
    async (metric, value, context = {}) => {
      await trackEvent('performance_metric', {
        metric,
        value,
        ...context,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent]
  );

  /**
   * Track conversion event
   * @param {string} conversionType - Type of conversion
   * @param {Object} conversionData - Conversion data
   */
  const trackConversion = useCallback(
    async (conversionType, conversionData = {}) => {
      await trackEvent('conversion', {
        conversionType,
        ...conversionData,
        timestamp: new Date().toISOString(),
      });
    },
    [trackEvent]
  );

  // Track page visibility changes for drop-off detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from tab - potential drop-off
        const currentStep = getCurrentStep();
        if (currentStep) {
          trackDropOff(currentStep, 'tab_hidden');
        }
      }
    };

    const handleBeforeUnload = () => {
      // User is leaving the page - definite drop-off
      const currentStep = getCurrentStep();
      if (currentStep) {
        // Use sendBeacon for reliable tracking on page unload
        const data = JSON.stringify({
          step: currentStep,
          timeSpent: onboardingStartTime.current ? Date.now() - onboardingStartTime.current : 0,
          reason: 'page_unload',
        });

        navigator.sendBeacon(`${process.env.REACT_APP_API_URL}/analytics/drop-off`, data);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trackDropOff]);

  // Helper function to get current step from URL or state
  const getCurrentStep = () => {
    const path = window.location.pathname;
    if (path.includes('onboarding')) {
      // Extract step from URL or return generic onboarding
      return 'onboarding';
    }
    return null;
  };

  return {
    // Core tracking functions
    trackEvent,
    trackOnboardingStart,
    trackStepStart,
    trackStepCompletion,
    trackStepFailure,
    trackOnboardingCompletion,
    trackDropOff,

    // Specialized tracking functions
    trackPageView,
    trackInteraction,
    trackError,
    trackPerformance,
    trackConversion,

    // Utility properties
    sessionId: sessionId.current,
  };
};

export default useAnalytics;

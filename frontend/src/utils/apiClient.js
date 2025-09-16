/**
 * API Client for FloWorx Frontend
 * Centralized API communication with error handling and authentication
 */

import {
  isNetworkError,
  isAuthError,
  withRetry,
  withTimeout,
} from '../../../shared/utils';

// API configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * API Client class
 */
class ApiClient {
  constructor(config = {}) {
    this.config = { ...API_CONFIG, ...config };
    this.interceptors = {
      request: [],
      response: [],
    };

    // Setup default interceptors
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default request/response interceptors
   */
  setupDefaultInterceptors() {
    // Request interceptor for authentication
    this.addRequestInterceptor(config => {
      const token = this.getAuthToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    });

    // Response interceptor for error handling
    this.addResponseInterceptor(
      response => response,
      error => this.handleResponseError(error)
    );
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(onFulfilled, onRejected) {
    this.interceptors.request.push({ onFulfilled, onRejected });
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(onFulfilled, onRejected) {
    this.interceptors.response.push({ onFulfilled, onRejected });
  }

  /**
   * Get authentication token from storage
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Set authentication token
   */
  setAuthToken(token, persistent = false) {
    if (persistent) {
      localStorage.setItem('authToken', token);
    } else {
      sessionStorage.setItem('authToken', token);
    }
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }

  /**
   * Handle response errors
   */
  async handleResponseError(error) {
    // Handle authentication errors
    if (isAuthError(error)) {
      this.clearAuthToken();

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Handle network errors with retry
    if (isNetworkError(error)) {
      console.warn('Network error detected, will retry if configured');
    }

    return Promise.reject(error);
  }

  /**
   * Apply request interceptors
   */
  async applyRequestInterceptors(config) {
    let processedConfig = config;

    for (const interceptor of this.interceptors.request) {
      try {
        if (interceptor.onFulfilled) {
          processedConfig = await interceptor.onFulfilled(processedConfig);
        }
      } catch (error) {
        if (interceptor.onRejected) {
          processedConfig = await interceptor.onRejected(error);
        } else {
          throw error;
        }
      }
    }

    return processedConfig;
  }

  /**
   * Apply response interceptors
   */
  async applyResponseInterceptors(response, error = null) {
    let processedResponse = response;
    let processedError = error;

    for (const interceptor of this.interceptors.response) {
      try {
        if (processedError && interceptor.onRejected) {
          processedResponse = await interceptor.onRejected(processedError);
          processedError = null;
        } else if (processedResponse && interceptor.onFulfilled) {
          processedResponse = await interceptor.onFulfilled(processedResponse);
        }
      } catch (err) {
        processedError = err;
        processedResponse = null;
      }
    }

    if (processedError) {
      throw processedError;
    }

    return processedResponse;
  }

  /**
   * Make HTTP request
   */
  async request(config) {
    try {
      // Apply request interceptors
      const processedConfig = await this.applyRequestInterceptors({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        ...config,
      });

      // Build full URL
      const url = processedConfig.url.startsWith('http')
        ? processedConfig.url
        : `${this.config.baseURL}${processedConfig.url}`;

      // Prepare fetch options
      const fetchOptions = {
        method: processedConfig.method,
        headers: processedConfig.headers,
        credentials: 'include',
      };

      // Add body for non-GET requests
      if (processedConfig.method !== 'GET' && processedConfig.data) {
        fetchOptions.body = JSON.stringify(processedConfig.data);
      }

      // Make request with timeout and retry
      const response = await withTimeout(
        withRetry(() => fetch(url, fetchOptions), {
          maxRetries: this.config.retryAttempts,
          retryDelay: this.config.retryDelay,
          retryCondition: error => isNetworkError(error),
        }),
        this.config.timeout
      );

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Create response object
      const responseObj = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: processedConfig,
      };

      // Handle HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = responseObj;
        throw error;
      }

      // Apply response interceptors
      return await this.applyResponseInterceptors(responseObj);
    } catch (error) {
      // Apply error response interceptors
      await this.applyResponseInterceptors(null, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  /**
   * POST request
   */
  async post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT request
   */
  async put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH request
   */
  async patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

// Create default API client instance
const apiClient = new ApiClient();

// Export both the class and default instance
export { ApiClient };
export default apiClient;

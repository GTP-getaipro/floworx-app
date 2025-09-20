import axios from 'axios';
import { useState, useCallback } from 'react';

import { useErrorReporting } from '../contexts/ErrorContext';

/**
 * useApi - API Request Hook with Error Handling
 *
 * Provides a configured axios instance and request hook with automatic
 * authentication, error handling, and loading state management.
 *
 * @hook
 * @example
 * // Basic usage
 * const { request, loading, error } = useApi();
 *
 * const handleSubmit = async () => {
 *   const result = await request('/api/users', {
 *     method: 'POST',
 *     data: userData
 *   });
 *   if (result) {
 *     console.log('Success:', result);
 *   }
 * };
 *
 * @returns {Object} API utilities
 * @returns {Function} returns.request - Make API requests with error handling
 * @returns {boolean} returns.loading - Whether a request is in progress
 * @returns {string|null} returns.error - Current error message
 * @returns {Function} returns.clearError - Clear current error state
 *
 * @features
 * - Automatic JWT token authentication
 * - Request/response interceptors for error handling
 * - Loading state management
 * - Error reporting integration
 * - Token expiration handling (401 responses)
 * - Consistent error formatting
 * - Network error handling
 *
 * @dependencies
 * - Axios: HTTP client library
 * - ErrorContext: Global error reporting
 * - localStorage: Token storage
 */

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('floworx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('floworx_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { reportError } = useErrorReporting();

  const request = useCallback(
    async (method, url, data = null, options = {}) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api({
          method,
          url,
          data,
          ...options,
        });
        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
        setError(errorMessage);
        reportError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [reportError]
  );

  const get = useCallback((url, options) => request('GET', url, null, options), [request]);
  const post = useCallback((url, data, options) => request('POST', url, data, options), [request]);
  const put = useCallback((url, data, options) => request('PUT', url, data, options), [request]);
  const del = useCallback((url, options) => request('DELETE', url, null, options), [request]);

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    setError,
    api,
  };
};

export default useApi;

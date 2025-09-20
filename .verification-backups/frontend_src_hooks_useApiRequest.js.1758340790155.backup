import axios from 'axios';
import { useState, useCallback, useRef, useEffect } from 'react';

import { useErrorReporting } from '../contexts/ErrorContext';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const requestCache = new Map();

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
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

/**
 * Custom hook for making API requests with caching and error handling
 * @param {Object} options - Hook options
 * @param {boolean} options.cache - Whether to cache the request
 * @param {number} options.cacheTTL - Cache TTL in milliseconds
 * @param {boolean} options.retry - Whether to retry failed requests
 * @param {number} options.maxRetries - Maximum number of retries
 */
const useApiRequest = (options = {}) => {
  const { cache = false, cacheTTL = CACHE_TTL, retry = false, maxRetries = 3 } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { reportError } = useErrorReporting();
  const abortControllerRef = useRef(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Makes an API request with caching and retry logic
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} config - Additional axios config
   */
  const request = useCallback(
    async (method, url, data = null, config = {}) => {
      const cacheKey = `${method}:${url}:${JSON.stringify(data)}`;

      // Check cache if enabled
      if (cache && method.toLowerCase() === 'get') {
        const cachedData = requestCache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < cacheTTL) {
          return cachedData.data;
        }
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      let retries = 0;

      while (true) {
        try {
          const response = await api({
            method,
            url,
            data,
            signal: abortControllerRef.current.signal,
            ...config,
          });

          // Cache successful GET requests
          if (cache && method.toLowerCase() === 'get') {
            requestCache.set(cacheKey, {
              data: response.data,
              timestamp: Date.now(),
            });
          }

          setLoading(false);
          return response.data;
        } catch (error) {
          // Don't retry if request was aborted
          if (error.name === 'AbortError' || error.name === 'CanceledError') {
            throw error;
          }

          // Handle retry logic
          if (retry && retries < maxRetries) {
            retries++;
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
            continue;
          }

          setError(error);
          reportError(error);
          setLoading(false);
          throw error;
        }
      }
    },
    [cache, cacheTTL, retry, maxRetries, reportError]
  );

  /**
   * Abort current request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Clear cache for specific request or all cache
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   */
  const clearCache = useCallback((method = null, url = null, data = null) => {
    if (method && url) {
      const cacheKey = `${method}:${url}:${JSON.stringify(data)}`;
      requestCache.delete(cacheKey);
    } else {
      requestCache.clear();
    }
  }, []);

  // Request methods
  const get = useCallback((url, config) => request('GET', url, null, config), [request]);

  const post = useCallback((url, data, config) => request('POST', url, data, config), [request]);

  const put = useCallback((url, data, config) => request('PUT', url, data, config), [request]);

  const del = useCallback((url, config) => request('DELETE', url, null, config), [request]);

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    abort,
    clearCache,
    api,
  };
};

export default useApiRequest;

// Export axios instance for direct usage
export { api };

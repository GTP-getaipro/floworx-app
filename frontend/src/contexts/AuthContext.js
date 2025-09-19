import axios from 'axios';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com';
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true; // Enable cookies for session management

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Set up axios interceptor for authentication
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Session expired or invalid
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Verify session on app load
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await axios.get('/api/auth/verify');

        // Handle new response format
        if (response.data.success && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else if (response.data.user) {
          // Legacy format
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          // Invalid response format
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  // Login function
  const login = async (email, password) => {
    // Clear any previous errors
    clearErrors();

    try {
      const response = await axios.post('/api/auth/login', { email, password });

      // Handle new response format with success field
      if (response.data.success && response.data.user) {
        // New format: { success: true, user: {...}, meta: {...} }
        setUser(response.data.user);
        setIsAuthenticated(true);
        return {
          success: true,
          user: response.data.user,
          meta: response.data.meta
        };
      } else if (response.data.user) {
        // Legacy format: { token, user }
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true, user: response.data.user };
      } else if (response.data.userId) {
        // Cookie-based format: { userId } with cookies
        // Get user data from verify endpoint
        const verifyResponse = await axios.get('/api/auth/verify');
        if (verifyResponse.data.success && verifyResponse.data.user) {
          setUser(verifyResponse.data.user);
          setIsAuthenticated(true);
          return { success: true, user: verifyResponse.data.user };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);

      // Extract error message from new backend response structure
      let message = 'Login failed';
      let errorCode = null;
      let meta = null;

      if (error.response?.data) {
        const data = error.response.data;

        // Handle new response format: { success: false, error: { code, message }, meta: {...} }
        if (data.success === false && data.error) {
          message = data.error.message || 'Login failed';
          errorCode = data.error.code;
          meta = data.meta;
        }
        // Handle legacy error structure: { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }
        else if (data.error?.message) {
          message = data.error.message;
          errorCode = data.error.code;
        }
        // Handle simple message structure: { message: "..." }
        else if (data.message) {
          message = data.message;
        }
        // Handle direct error string: { error: "..." }
        else if (typeof data.error === 'string') {
          message = data.error;
        }
      }

      // Handle specific error cases
      if (error.response?.status === 403 && errorCode === 'EMAIL_NOT_VERIFIED') {
        return {
          success: false,
          error: message,
          code: 'EMAIL_NOT_VERIFIED',
          resendUrl: meta?.resendUrl || '/api/auth/resend',
          meta
        };
      }

      // Provide user-friendly messages for common errors
      if (error.response?.status === 401) {
        message = 'Invalid email or password. Please check your credentials and try again.';
      }

      const errorResult = {
        success: false,
        error: message,
        status: error.response?.status,
        code: error.response?.data?.error?.code
      };

      // Store the error for debugging
      setLastError(errorResult);

      return errorResult;
    }
  };

  // Register function
  const register = async userData => {
    // Clear any previous errors
    clearErrors();

    try {
      const response = await axios.post('/api/auth/register', userData);

      // Handle successful response with new schema
      if (response.data.success) {
        return {
          success: true,
          requiresVerification: response.data.meta?.requiresVerification || true,
          user: response.data.user,
          meta: response.data.meta
        };
      } else {
        // Handle error response with success: false
        const message = response.data.error?.message || 'Registration failed';
        const errorResult = {
          success: false,
          error: message,
          status: response.status,
        };
        setLastError(errorResult);
        return errorResult;
      }
    } catch (error) {
      console.error('Registration error:', error);

      // Extract error message from different possible response structures
      let message = 'Registration failed';

      if (error.response?.data) {
        const data = error.response.data;
        // Handle backend error structure: { error: { code: "EMAIL_EXISTS", message: "Email already registered" } }
        if (data.error?.message) {
          message = data.error.message;
        }
        // Handle simple message structure: { message: "..." }
        else if (data.message) {
          message = data.message;
        }
        // Handle direct error string: { error: "..." }
        else if (typeof data.error === 'string') {
          message = data.error;
        }
      }

      // Provide user-friendly messages for common errors
      if (error.response?.status === 409) {
        if (message.toLowerCase().includes('email already registered') || message.toLowerCase().includes('email exists')) {
          message = 'This email is already registered. Please sign in or use a different email address.';
        }
      }

      const errorResult = {
        success: false,
        error: message,
        status: error.response?.status,
        code: error.response?.data?.error?.code
      };

      // Store the error for debugging
      setLastError(errorResult);

      return errorResult;
    }
  };

  // Clear errors function
  const clearErrors = () => {
    setLastError(null);
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      clearErrors(); // Clear any errors on logout
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    lastError,
    login,
    register,
    logout,
    clearErrors,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

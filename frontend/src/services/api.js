/**
 * Enhanced API Service
 * Handles all API calls with proper error handling, authentication, and loading states
 */

// Custom error class - defined first to avoid "used before defined" errors
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'https://app.floworx-iq.com';
    this.token = this.getStoredToken();
  }

  // Token management
  getStoredToken() {
    return localStorage.getItem('floworx_token') || sessionStorage.getItem('floworx_token');
  }

  setToken(token, remember = false) {
    this.token = token;
    if (remember) {
      localStorage.setItem('floworx_token', token);
      sessionStorage.removeItem('floworx_token');
    } else {
      sessionStorage.setItem('floworx_token', token);
      localStorage.removeItem('floworx_token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('floworx_token');
    sessionStorage.removeItem('floworx_token');
  }

  // Request headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Enhanced fetch with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.includeAuth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login';
          throw new ApiError('Authentication required', 401, data);
        }

        if (response.status === 403) {
          throw new ApiError('Access forbidden', 403, data);
        }

        if (response.status === 404) {
          throw new ApiError('Resource not found', 404, data);
        }

        if (response.status >= 500) {
          throw new ApiError('Server error. Please try again later.', response.status, data);
        }

        // Extract error message from response
        const errorMessage =
          data?.message || data?.error || `Request failed with status ${response.status}`;
        throw new ApiError(errorMessage, response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new ApiError('Network error. Please check your connection.', 0, null);
      }

      throw new ApiError(error.message || 'An unexpected error occurred', 0, null);
    }
  }

  // HTTP methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Authentication endpoints
  async register(userData) {
    try {
      const response = await this.post('/api/auth/register', userData, { includeAuth: false });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(credentials) {
    try {
      const response = await this.post('/api/auth/login', credentials, { includeAuth: false });
      if (response.token) {
        this.setToken(response.token, credentials.remember);
      }
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await this.post('/api/auth/logout');
    } catch (error) {
      // Logout request failed - continue with local cleanup
    } finally {
      this.clearToken();
    }
  }

  // User endpoints
  async getUserStatus() {
    try {
      const response = await this.get('/api/user/status');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(profileData) {
    try {
      const response = await this.put('/api/user/profile', profileData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // OAuth endpoints
  getOAuthUrl(provider = 'google') {
    return `${this.baseURL}/api/oauth/${provider}`;
  }

  async handleOAuthCallback(code, state) {
    try {
      const response = await this.post(
        '/api/oauth/callback',
        { code, state },
        { includeAuth: false }
      );
      if (response.token) {
        this.setToken(response.token, true);
      }
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Dashboard endpoints
  async getDashboardData() {
    try {
      const response = await this.get('/api/dashboard');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Credentials endpoints
  async getCredentials() {
    try {
      const response = await this.get('/api/credentials');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveCredentials(credentialsData) {
    try {
      const response = await this.post('/api/credentials', credentialsData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.get('/api/health', { includeAuth: false });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiError };

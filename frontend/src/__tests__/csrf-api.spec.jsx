import { ensureCsrf, getCsrf, invalidateCsrf } from '../lib/csrf';
import { api } from '../lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('CSRF Token Management', () => {
  beforeEach(() => {
    // Reset CSRF state before each test
    invalidateCsrf();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureCsrf', () => {
    it('should fetch CSRF token from server', async () => {
      const mockCsrfToken = 'test-csrf-token-123';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      const token = await ensureCsrf();

      expect(fetch).toHaveBeenCalledWith('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      expect(token).toBe(mockCsrfToken);
      expect(getCsrf()).toBe(mockCsrfToken);
    });

    it('should return cached token on subsequent calls', async () => {
      const mockCsrfToken = 'cached-csrf-token';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      // First call should fetch
      const token1 = await ensureCsrf();
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const token2 = await ensureCsrf();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(token1).toBe(token2);
    });

    it('should handle concurrent calls with promise caching', async () => {
      const mockCsrfToken = 'concurrent-csrf-token';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      // Make multiple concurrent calls
      const promises = [ensureCsrf(), ensureCsrf(), ensureCsrf()];
      const tokens = await Promise.all(promises);

      // Should only make one fetch call
      expect(fetch).toHaveBeenCalledTimes(1);
      // All tokens should be the same
      expect(tokens).toEqual([mockCsrfToken, mockCsrfToken, mockCsrfToken]);
    });

    it('should throw error on fetch failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(ensureCsrf()).rejects.toThrow('Failed to fetch CSRF token: 500');
      expect(getCsrf()).toBeNull();
    });

    it('should throw error when CSRF token missing from response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}) // Missing csrf field
      });

      await expect(ensureCsrf()).rejects.toThrow('CSRF token not found in response');
    });
  });

  describe('getCsrf', () => {
    it('should return null when no token is cached', () => {
      expect(getCsrf()).toBeNull();
    });

    it('should return cached token after ensureCsrf', async () => {
      const mockCsrfToken = 'get-csrf-token';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      await ensureCsrf();
      expect(getCsrf()).toBe(mockCsrfToken);
    });
  });

  describe('invalidateCsrf', () => {
    it('should clear cached token', async () => {
      const mockCsrfToken = 'invalidate-test-token';
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      await ensureCsrf();
      expect(getCsrf()).toBe(mockCsrfToken);

      invalidateCsrf();
      expect(getCsrf()).toBeNull();
    });
  });
});

describe('API Wrapper with CSRF', () => {
  beforeEach(() => {
    invalidateCsrf();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should not attach CSRF token for GET requests', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      });

      await api('/api/test', { method: 'GET' });

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {},
        body: undefined,
        credentials: 'include'
      });
    });
  });

  describe('POST requests', () => {
    it('should attach CSRF token for POST requests', async () => {
      const mockCsrfToken = 'post-csrf-token';
      
      // Mock CSRF fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      // Mock actual API call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await api('/api/test', {
        method: 'POST',
        body: { test: 'data' }
      });

      // Should have made 2 calls: CSRF fetch + actual API call
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Check CSRF fetch
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/auth/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      // Check API call with CSRF token
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': mockCsrfToken
        },
        body: JSON.stringify({ test: 'data' }),
        credentials: 'include'
      });
    });

    it('should retry once on CSRF_FORBIDDEN error', async () => {
      const oldCsrfToken = 'old-csrf-token';
      const newCsrfToken = 'new-csrf-token';
      
      // Mock initial CSRF fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: oldCsrfToken })
      });

      // Mock first API call (fails with CSRF_FORBIDDEN)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: { code: 'CSRF_FORBIDDEN', message: 'CSRF token invalid' }
        })
      });

      // Mock second CSRF fetch (for retry)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: newCsrfToken })
      });

      // Mock retry API call (succeeds)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await api('/api/test', {
        method: 'POST',
        body: { test: 'data' }
      });

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(4);
      
      // Verify the retry used the new CSRF token
      expect(fetch).toHaveBeenNthCalledWith(4, '/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': newCsrfToken
        },
        body: JSON.stringify({ test: 'data' }),
        credentials: 'include'
      });
    });

    it('should not retry on non-CSRF errors', async () => {
      const mockCsrfToken = 'no-retry-csrf-token';
      
      // Mock CSRF fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      // Mock API call (fails with non-CSRF error)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid data' }
        })
      });

      await expect(api('/api/test', {
        method: 'POST',
        body: { test: 'data' }
      })).rejects.toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        status: 400
      });

      // Should only make 2 calls (CSRF + API), no retry
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Other unsafe methods', () => {
    it.each(['PUT', 'PATCH', 'DELETE'])('should attach CSRF token for %s requests', async (method) => {
      const mockCsrfToken = `${method.toLowerCase()}-csrf-token`;
      
      // Mock CSRF fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrf: mockCsrfToken })
      });

      // Mock API call
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await api('/api/test', { method });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/test', {
        method,
        headers: {
          'x-csrf-token': mockCsrfToken
        },
        body: undefined,
        credentials: 'include'
      });
    });
  });
});

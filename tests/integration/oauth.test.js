/**
 * OAuth Integration Tests
 * Tests OAuth flows, token management, and service integrations
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
        revokeToken: jest.fn()
      }))
    },
    oauth2: jest.fn().mockImplementation(() => ({
      userinfo: {
        get: jest.fn()
      }
    }))
  }
}));

// Mock database operations
jest.mock('../../backend/database/database-operations', () => ({
  databaseOperations: {
    storeCredentials: jest.fn(),
    getCredentials: jest.fn(),
    getUserProfile: jest.fn(),
    getUserConnectedServices: jest.fn()
  }
}));

// Mock encryption utilities
jest.mock('../../backend/utils/encryption', () => ({
  encrypt: jest.fn((text) => `encrypted_${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted_', ''))
}));

const app = require('../../backend/app');
const { databaseOperations } = require('../../backend/database/database-operations');
const { oauthService } = require('../../backend/services/OAuthService');

describe('OAuth Integration Tests', () => {
  let mockUser;
  let authToken;
  let mockOAuth2Client;
  let mockOAuth2Api;

  beforeEach(() => {
    // Setup mock user
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    // Generate test JWT token
    authToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Setup Google OAuth mocks
    mockOAuth2Client = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
      revokeToken: jest.fn()
    };

    mockOAuth2Api = {
      userinfo: {
        get: jest.fn()
      }
    };

    google.auth.OAuth2.mockImplementation(() => mockOAuth2Client);
    google.oauth2.mockImplementation(() => mockOAuth2Api);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('OAuth Initiation', () => {
    test('should initiate Google OAuth flow with valid token', async () => {
      const authUrl = 'https://accounts.google.com/oauth/authorize?client_id=test';
      mockOAuth2Client.generateAuthUrl.mockReturnValue(authUrl);

      const response = await request(app)
        .get('/api/oauth/google')
        .query({ token: authToken });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(authUrl);
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: expect.arrayContaining([
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/gmail.readonly'
        ]),
        state: mockUser.id,
        prompt: 'consent',
        include_granted_scopes: true
      });
    });

    test('should redirect with error for missing token', async () => {
      const response = await request(app)
        .get('/api/oauth/google');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=auth_required');
    });

    test('should redirect with error for invalid token', async () => {
      const response = await request(app)
        .get('/api/oauth/google')
        .query({ token: 'invalid-token' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_token');
    });

    test('should handle OAuth configuration errors', async () => {
      // Temporarily remove environment variables
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      const response = await request(app)
        .get('/api/oauth/google')
        .query({ token: authToken });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=config_error');

      // Restore environment variable
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe('OAuth Callback', () => {
    test('should handle successful OAuth callback', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000
      };

      const mockUserInfo = {
        data: {
          id: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      mockOAuth2Api.userinfo.get.mockResolvedValue(mockUserInfo);
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state: mockUser.id
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('connected=google');
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('test-auth-code');
      expect(databaseOperations.storeCredentials).toHaveBeenCalledWith(
        mockUser.id,
        'google',
        mockTokens.access_token,
        mockTokens.refresh_token,
        expect.any(Date),
        expect.any(String)
      );
    });

    test('should handle OAuth denial', async () => {
      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query({
          error: 'access_denied',
          state: mockUser.id
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=oauth_denied');
    });

    test('should handle missing authorization code', async () => {
      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query({
          state: mockUser.id
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_callback');
    });

    test('should handle token exchange failure', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Token exchange failed'));

      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query({
          code: 'test-auth-code',
          state: mockUser.id
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=token_exchange_failed');
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      // Mock user authentication
      databaseOperations.getUserProfile.mockResolvedValue({
        data: mockUser,
        error: null
      });
    });

    test('should refresh access token successfully', async () => {
      const mockCredentials = {
        accessToken: 'old-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: new Date(Date.now() - 1000), // Expired
        scope: 'test-scope'
      };

      const mockNewCredentials = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCredentials,
        error: null
      });
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockNewCredentials
      });
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ provider: 'google' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.refreshed).toBe(true);
      expect(mockOAuth2Client.refreshAccessToken).toHaveBeenCalled();
    });

    test('should handle missing refresh token', async () => {
      databaseOperations.getCredentials.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ provider: 'google' });

      expect(response.status).toBe(401);
      expect(response.body.requiresReauth).toBe(true);
    });

    test('should handle invalid refresh token', async () => {
      const mockCredentials = {
        accessToken: 'old-access-token',
        refreshToken: 'invalid-refresh-token',
        expiryDate: new Date(Date.now() - 1000)
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCredentials,
        error: null
      });
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('invalid_grant: Bad Request')
      );

      const response = await request(app)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ provider: 'google' });

      expect(response.status).toBe(401);
      expect(response.body.requiresReauth).toBe(true);
      expect(response.body.error).toBe('Re-authentication required');
    });

    test('should handle unsupported provider', async () => {
      const response = await request(app)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ provider: 'unsupported' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Unsupported provider');
    });
  });

  describe('OAuth Status', () => {
    beforeEach(() => {
      databaseOperations.getUserProfile.mockResolvedValue({
        data: mockUser,
        error: null
      });
    });

    test('should return OAuth connection status', async () => {
      const mockConnections = [
        {
          service: 'google',
          status: 'active',
          connected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          has_refresh_token: true,
          scope: 'email profile gmail'
        }
      ];

      // Mock the OAuth service method
      jest.spyOn(oauthService, 'getOAuthConnections').mockResolvedValue(mockConnections);

      const response = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connections).toEqual(mockConnections);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.active).toBe(1);
    });

    test('should handle OAuth status errors', async () => {
      jest.spyOn(oauthService, 'getOAuthConnections').mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/oauth/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get OAuth status');
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      databaseOperations.getUserProfile.mockResolvedValue({
        data: mockUser,
        error: null
      });
    });

    test('should disconnect OAuth connection successfully', async () => {
      const mockCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCredentials,
        error: null
      });
      mockOAuth2Client.revokeToken.mockResolvedValue({});
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/oauth/google')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockOAuth2Client.revokeToken).toHaveBeenCalledWith('test-access-token');
    });

    test('should handle disconnect when no connection exists', async () => {
      databaseOperations.getCredentials.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await request(app)
        .delete('/api/oauth/google')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('No connection found');
    });

    test('should handle provider revocation failure gracefully', async () => {
      const mockCredentials = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCredentials,
        error: null
      });
      mockOAuth2Client.revokeToken.mockRejectedValue(new Error('Provider error'));
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/oauth/google')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should still succeed even if provider revocation fails
    });
  });

  describe('User Status with OAuth', () => {
    beforeEach(() => {
      databaseOperations.getUserProfile.mockResolvedValue({
        data: mockUser,
        error: null
      });
      databaseOperations.getUserConnectedServices.mockResolvedValue({
        data: [],
        error: null
      });
    });

    test('should include OAuth connections in user status', async () => {
      const mockOAuthConnections = [
        {
          service: 'google',
          status: 'active',
          connected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      ];

      jest.spyOn(oauthService, 'getOAuthConnections').mockResolvedValue(mockOAuthConnections);

      const response = await request(app)
        .get('/api/user/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.oauth_connections).toEqual(mockOAuthConnections);
      expect(response.body.data.has_google_connection).toBe(true);
    });

    test('should handle OAuth service errors in user status', async () => {
      jest.spyOn(oauthService, 'getOAuthConnections').mockRejectedValue(
        new Error('OAuth service error')
      );

      const response = await request(app)
        .get('/api/user/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.oauth_connections).toEqual([]);
      expect(response.body.data.has_google_connection).toBe(false);
    });
  });
});

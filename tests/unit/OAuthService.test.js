/**
 * OAuth Service Unit Tests
 * Tests the OAuth service module functionality
 */

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
    getCredentials: jest.fn()
  }
}));

const { OAuthService } = require('../../backend/services/OAuthService');
const { databaseOperations } = require('../../backend/database/database-operations');

describe('OAuthService Unit Tests', () => {
  let oauthService;
  let mockOAuth2Client;
  let mockOAuth2Api;

  beforeEach(() => {
    oauthService = new OAuthService();
    
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

    // Set up environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';

    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with supported providers', () => {
      expect(oauthService.supportedProviders).toContain('google');
      expect(oauthService.scopes.google).toContain('https://www.googleapis.com/auth/userinfo.email');
    });

    test('should create Google OAuth2 client with correct configuration', () => {
      const client = oauthService.getGoogleOAuth2Client();
      
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/callback'
      );
    });

    test('should throw error for missing Google configuration', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      
      expect(() => {
        oauthService.getGoogleOAuth2Client();
      }).toThrow('Google OAuth configuration missing');
    });
  });

  describe('Authorization URL Generation', () => {
    test('should generate Google authorization URL', () => {
      const expectedUrl = 'https://accounts.google.com/oauth/authorize?client_id=test';
      mockOAuth2Client.generateAuthUrl.mockReturnValue(expectedUrl);

      const authUrl = oauthService.generateAuthUrl('google', 'test-user-id');

      expect(authUrl).toBe(expectedUrl);
      expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: oauthService.scopes.google,
        state: 'test-user-id',
        prompt: 'consent',
        include_granted_scopes: true
      });
    });

    test('should throw error for unsupported provider', () => {
      expect(() => {
        oauthService.generateAuthUrl('unsupported', 'test-user-id');
      }).toThrow('Unsupported OAuth provider: unsupported');
    });
  });

  describe('Token Exchange', () => {
    test('should exchange authorization code for tokens successfully', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'email profile'
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

      const result = await oauthService.exchangeCodeForTokens('google', 'test-code', 'test-user-id');

      expect(result.success).toBe(true);
      expect(result.userInfo).toEqual(mockUserInfo.data);
      expect(result.tokens.hasAccessToken).toBe(true);
      expect(result.tokens.hasRefreshToken).toBe(true);
      expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('test-code');
      expect(databaseOperations.storeCredentials).toHaveBeenCalled();
    });

    test('should handle token exchange failure', async () => {
      mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid authorization code'));

      await expect(
        oauthService.exchangeCodeForTokens('google', 'invalid-code', 'test-user-id')
      ).rejects.toThrow('Failed to exchange authorization code');
    });

    test('should handle missing access token', async () => {
      const mockTokens = {
        refresh_token: 'test-refresh-token'
        // Missing access_token
      };

      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });

      await expect(
        oauthService.exchangeCodeForTokens('google', 'test-code', 'test-user-id')
      ).rejects.toThrow('No access token received from Google');
    });
  });

  describe('Token Storage and Retrieval', () => {
    test('should store tokens successfully', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expiry_date: Date.now() + 3600000,
        scope: 'email profile'
      };

      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      await oauthService.storeTokens('test-user-id', 'google', mockTokens);

      expect(databaseOperations.storeCredentials).toHaveBeenCalledWith(
        'test-user-id',
        'google',
        'test-access-token',
        'test-refresh-token',
        expect.any(Date),
        'email profile'
      );
    });

    test('should retrieve tokens successfully', async () => {
      const mockStoredTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: new Date(Date.now() + 3600000),
        scope: 'email profile'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockStoredTokens,
        error: null
      });

      const tokens = await oauthService.getTokens('test-user-id', 'google');

      expect(tokens).toEqual(mockStoredTokens);
      expect(databaseOperations.getCredentials).toHaveBeenCalledWith('test-user-id', 'google');
    });

    test('should return null for non-existent tokens', async () => {
      databaseOperations.getCredentials.mockResolvedValue({
        data: null,
        error: null
      });

      const tokens = await oauthService.getTokens('test-user-id', 'google');

      expect(tokens).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token successfully', async () => {
      const mockCurrentTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: new Date(Date.now() - 1000), // Expired
        scope: 'email profile'
      };

      const mockNewCredentials = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCurrentTokens,
        error: null
      });
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockNewCredentials
      });
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const result = await oauthService.refreshAccessToken('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
        refresh_token: 'test-refresh-token'
      });
    });

    test('should handle missing refresh token', async () => {
      databaseOperations.getCredentials.mockResolvedValue({
        data: null,
        error: null
      });

      await expect(
        oauthService.refreshAccessToken('test-user-id', 'google')
      ).rejects.toThrow('No refresh token available');
    });

    test('should handle refresh token failure', async () => {
      const mockCurrentTokens = {
        accessToken: 'old-access-token',
        refreshToken: 'invalid-refresh-token',
        expiryDate: new Date(Date.now() - 1000)
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockCurrentTokens,
        error: null
      });
      mockOAuth2Client.refreshAccessToken.mockRejectedValue(
        new Error('invalid_grant')
      );

      await expect(
        oauthService.refreshAccessToken('test-user-id', 'google')
      ).rejects.toThrow('Token refresh failed');
    });
  });

  describe('Token Validation', () => {
    test('should identify tokens that need refresh', () => {
      const soonToExpireTokens = {
        expiryDate: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      };

      const validTokens = {
        expiryDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };

      expect(oauthService.needsRefresh(soonToExpireTokens)).toBe(true);
      expect(oauthService.needsRefresh(validTokens)).toBe(false);
      expect(oauthService.needsRefresh({})).toBe(false);
      expect(oauthService.needsRefresh(null)).toBe(false);
    });

    test('should get valid access token without refresh', async () => {
      const mockTokens = {
        accessToken: 'valid-access-token',
        expiryDate: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockTokens,
        error: null
      });

      const result = await oauthService.getValidAccessToken('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('valid-access-token');
      expect(result.refreshed).toBe(false);
    });

    test('should get valid access token with refresh', async () => {
      const mockExpiredTokens = {
        accessToken: 'expired-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        scope: 'email profile'
      };

      const mockNewCredentials = {
        access_token: 'new-access-token',
        expiry_date: Date.now() + 3600000
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockExpiredTokens,
        error: null
      });
      mockOAuth2Client.refreshAccessToken.mockResolvedValue({
        credentials: mockNewCredentials
      });
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const result = await oauthService.getValidAccessToken('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshed).toBe(true);
    });
  });

  describe('Connection Status', () => {
    test('should get OAuth connections status', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiryDate: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date().toISOString(),
        scope: 'email profile'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockTokens,
        error: null
      });

      const connections = await oauthService.getOAuthConnections('test-user-id');

      expect(connections).toHaveLength(1);
      expect(connections[0]).toMatchObject({
        service: 'google',
        status: 'active',
        has_refresh_token: true,
        scope: 'email profile'
      });
    });

    test('should check active connection status', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        expiryDate: new Date(Date.now() + 30 * 60 * 1000)
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockTokens,
        error: null
      });

      const hasConnection = await oauthService.hasActiveConnection('test-user-id', 'google');

      expect(hasConnection).toBe(true);
    });
  });

  describe('Connection Revocation', () => {
    test('should revoke connection successfully', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockTokens,
        error: null
      });
      mockOAuth2Client.revokeToken.mockResolvedValue({});
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const result = await oauthService.revokeConnection('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(mockOAuth2Client.revokeToken).toHaveBeenCalledWith('test-access-token');
    });

    test('should handle revocation when no connection exists', async () => {
      databaseOperations.getCredentials.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await oauthService.revokeConnection('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(result.message).toContain('No connection found');
    });

    test('should continue with local deletion if remote revocation fails', async () => {
      const mockTokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      };

      databaseOperations.getCredentials.mockResolvedValue({
        data: mockTokens,
        error: null
      });
      mockOAuth2Client.revokeToken.mockRejectedValue(new Error('Provider error'));
      databaseOperations.storeCredentials.mockResolvedValue({ success: true });

      const result = await oauthService.revokeConnection('test-user-id', 'google');

      expect(result.success).toBe(true);
      expect(result.message).toContain('revoked successfully');
    });
  });
});

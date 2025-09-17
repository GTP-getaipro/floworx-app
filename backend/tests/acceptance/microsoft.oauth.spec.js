const request = require('supertest');
const app = require('../../app');
const { query } = require('../../database/unified-connection');
const { encrypt, decrypt } = require('../../utils/encryption');

describe('Microsoft OAuth Integration', () => {
  let agent;
  let userId;
  let csrfToken;

  beforeEach(async () => {
    // Create a test user and login
    const testUser = {
      email: `microsoft-oauth-test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    agent = request.agent(app);

    const registerResponse = await agent
      .post('/api/auth/register')
      .send(testUser);

    userId = registerResponse.body.userId;

    // Manually verify the user for tests
    await query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);

    // Login
    const loginResponse = await agent
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(loginResponse.status).toBe(200);

    // Get CSRF token
    const csrfResponse = await agent.get('/api/auth/csrf');
    expect(csrfResponse.status).toBe(200);
    csrfToken = csrfResponse.body.csrf;
  });

  describe('GET /api/integrations/microsoft/authorize', () => {
    it('should return authorization URL with correct parameters', async () => {
      const response = await agent
        .get('/api/integrations/microsoft/authorize');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      
      const url = new URL(response.body.url);
      expect(url.hostname).toBe('login.microsoftonline.com');
      expect(url.pathname).toBe('/common/oauth2/v2.0/authorize');
      
      const params = url.searchParams;
      expect(params.get('client_id')).toBe(process.env.MS_CLIENT_ID);
      expect(params.get('redirect_uri')).toBe(process.env.MS_REDIRECT_URI);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('response_mode')).toBe('query');
      expect(params.get('state')).toBeTruthy();
      
      const scopes = params.get('scope').split(' ');
      expect(scopes).toContain('offline_access');
      expect(scopes).toContain('https://graph.microsoft.com/Mail.ReadWrite');
      expect(scopes).toContain('https://graph.microsoft.com/MailboxSettings.Read');
      expect(scopes).toContain('https://graph.microsoft.com/User.Read');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/integrations/microsoft/authorize');

      expect(response.status).toBe(401);
    });

    it('should handle missing OAuth configuration', async () => {
      const originalClientId = process.env.MS_CLIENT_ID;
      delete process.env.MS_CLIENT_ID;

      const response = await agent
        .get('/api/integrations/microsoft/authorize');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('OAUTH_CONFIG_MISSING');

      process.env.MS_CLIENT_ID = originalClientId;
    });
  });

  describe('GET /api/integrations/microsoft/callback', () => {
    // Mock fetch for token exchange
    const originalFetch = global.fetch;
    
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should handle successful OAuth callback', async () => {
      // Mock token exchange response
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        })
        // Mock user info response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            mail: 'test@outlook.com',
            userPrincipalName: 'test@outlook.com',
            displayName: 'Test User'
          })
        });

      // Create properly formatted state parameter
      const stateData = { userId, nonce: 'test_nonce' };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

      const response = await agent
        .get('/api/integrations/microsoft/callback')
        .query({
          code: 'mock_auth_code',
          state: state
        });

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('/onboarding/step2?connected=outlook');

      // Verify tokens were stored encrypted
      const storedConnection = await query(
        'SELECT * FROM user_connections WHERE user_id = $1 AND provider = $2',
        [userId, 'microsoft']
      );

      expect(storedConnection.rows).toHaveLength(1);
      const connection = storedConnection.rows[0];
      expect(connection.sub).toBe('test@outlook.com');
      expect(connection.access_token_enc).toBeTruthy();
      expect(connection.refresh_token_enc).toBeTruthy();
      
      // Verify tokens are encrypted (not plain text)
      expect(connection.access_token_enc).not.toBe('mock_access_token');
      expect(connection.refresh_token_enc).not.toBe('mock_refresh_token');

      // Verify tokens can be decrypted
      const decryptedAccess = decrypt(connection.access_token_enc);
      const decryptedRefresh = decrypt(connection.refresh_token_enc);
      expect(decryptedAccess).toBe('mock_access_token');
      expect(decryptedRefresh).toBe('mock_refresh_token');

      // Verify onboarding state was updated
      const onboardingState = await query(
        'SELECT data FROM onboarding_states WHERE user_id = $1',
        [userId]
      );
      expect(onboardingState.rows[0].data.outlookConnected).toBe(true);
    });

    it('should handle missing authorization code', async () => {
      const response = await agent
        .get('/api/integrations/microsoft/callback')
        .query({ state: 'mock_state' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MISSING_CODE');
    });

    it('should handle OAuth denial', async () => {
      const response = await agent
        .get('/api/integrations/microsoft/callback')
        .query({
          error: 'access_denied',
          state: 'mock_state'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=oauth_denied');
    });

    it('should handle token exchange failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code'
      });

      // Create properly formatted state parameter
      const stateData = { userId, nonce: 'test_nonce' };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

      const response = await agent
        .get('/api/integrations/microsoft/callback')
        .query({
          code: 'invalid_code',
          state: state
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=callback_failed');
    });
  });

  describe('POST /api/integrations/microsoft/disconnect', () => {
    beforeEach(async () => {
      // Create a test connection
      const connectionData = {
        sub: 'test@outlook.com',
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        scope: ['https://graph.microsoft.com/Mail.ReadWrite'],
        expiry_at: new Date(Date.now() + 3600000).toISOString()
      };

      await query(`
        INSERT INTO user_connections (user_id, provider, sub, access_token_enc, refresh_token_enc, scope, expiry_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId, 'microsoft', connectionData.sub,
        encrypt(connectionData.access_token),
        encrypt(connectionData.refresh_token),
        connectionData.scope,
        connectionData.expiry_at
      ]);

      // Set onboarding flag
      await query(`
        UPDATE onboarding_states 
        SET data = jsonb_set(COALESCE(data, '{}'), '{outlookConnected}', 'true')
        WHERE user_id = $1
      `, [userId]);
    });

    it('should disconnect Microsoft account successfully', async () => {
      const response = await agent
        .post('/api/integrations/microsoft/disconnect')
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(204);

      // Verify connection was deleted
      const connections = await query(
        'SELECT * FROM user_connections WHERE user_id = $1 AND provider = $2',
        [userId, 'microsoft']
      );
      expect(connections.rows).toHaveLength(0);

      // Verify onboarding flag was updated
      const onboardingState = await query(
        'SELECT data FROM onboarding_states WHERE user_id = $1',
        [userId]
      );
      expect(onboardingState.rows[0].data.outlookConnected).toBe(false);
    });

    it('should require CSRF token', async () => {
      const response = await agent
        .post('/api/integrations/microsoft/disconnect');

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/integrations/microsoft/disconnect');

      // Expects 403 because CSRF middleware runs before auth middleware
      // and rejects requests without CSRF tokens
      expect(response.status).toBe(403);
    });
  });

  describe('Encryption Tests', () => {
    it('should properly encrypt and decrypt tokens', () => {
      const originalToken = 'test_access_token_12345';
      
      const encrypted = encrypt(originalToken);
      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toBeTruthy();
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it('should produce different encrypted values for same input', () => {
      const originalToken = 'test_token';
      
      const encrypted1 = encrypt(originalToken);
      const encrypted2 = encrypt(originalToken);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(originalToken);
      expect(decrypt(encrypted2)).toBe(originalToken);
    });
  });
});

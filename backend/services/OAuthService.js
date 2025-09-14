/**
 * OAuth Service Module
 * Centralized OAuth operations for FloworxInvite SaaS
 * Handles Google OAuth, token management, and service integrations
 */

const { google } = require('googleapis');
const { databaseOperations } = require('../database/database-operations');
const { encrypt, decrypt } = require('../utils/encryption');

class OAuthService {
  constructor() {
    this.supportedProviders = ['google'];
    this.scopes = {
      google: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    };
  }

  // =====================================================
  // GOOGLE OAUTH CLIENT MANAGEMENT
  // =====================================================

  /**
   * Get configured Google OAuth2 client
   * @returns {google.auth.OAuth2} OAuth2 client instance
   */
  getGoogleOAuth2Client() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error('Google OAuth configuration missing. Please check environment variables.');
    }

    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // =====================================================
  // OAUTH FLOW MANAGEMENT
  // =====================================================

  /**
   * Generate OAuth authorization URL
   * @param {string} provider - OAuth provider (google)
   * @param {string} userId - User ID for state parameter
   * @returns {string} Authorization URL
   */
  generateAuthUrl(provider, userId) {
    if (!this.supportedProviders.includes(provider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    if (provider === 'google') {
      const oauth2Client = this.getGoogleOAuth2Client();
      
      return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required for refresh token
        scope: this.scopes.google,
        state: userId, // Pass user ID for callback
        prompt: 'consent', // Force consent to ensure refresh token
        include_granted_scopes: true
      });
    }

    throw new Error(`Authorization URL generation not implemented for ${provider}`);
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} provider - OAuth provider
   * @param {string} code - Authorization code
   * @param {string} userId - User ID from state parameter
   * @returns {Object} Token exchange result
   */
  async exchangeCodeForTokens(provider, code, userId) {
    if (!this.supportedProviders.includes(provider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    if (provider === 'google') {
      const oauth2Client = this.getGoogleOAuth2Client();
      
      try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        if (!tokens.access_token) {
          throw new Error('No access token received from Google');
        }

        // Get user info to verify the connection
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Store encrypted tokens in database
        await this.storeTokens(userId, provider, tokens);

        return {
          success: true,
          userInfo: userInfo.data,
          tokens: {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiryDate: tokens.expiry_date
          }
        };
      } catch (error) {
        console.error(`${provider} token exchange error:`, error);
        throw new Error(`Failed to exchange authorization code: ${error.message}`);
      }
    }

    throw new Error(`Token exchange not implemented for ${provider}`);
  }

  // =====================================================
  // TOKEN STORAGE AND RETRIEVAL
  // =====================================================

  /**
   * Store OAuth tokens securely in database
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @param {Object} tokens - Token object from OAuth provider
   */
  async storeTokens(userId, provider, tokens) {
    try {
      const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      const scope = tokens.scope || this.scopes[provider]?.join(' ');

      const result = await databaseOperations.storeCredentials(
        userId,
        provider,
        tokens.access_token,
        tokens.refresh_token || null,
        expiryDate,
        scope
      );

      return result;
    } catch (error) {
      
      throw new Error(`Token storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve OAuth tokens for a user and provider
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {Object|null} Decrypted tokens or null if not found
   */
  async getTokens(userId, provider) {
    try {
      const result = await databaseOperations.getCredentials(userId, provider);
      
      if (result.error || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      
      return null;
    }
  }

  // =====================================================
  // TOKEN REFRESH MECHANISM
  // =====================================================

  /**
   * Refresh access token using refresh token
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {Object} Refresh result
   */
  async refreshAccessToken(userId, provider) {
    if (!this.supportedProviders.includes(provider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      // Get current tokens
      const currentTokens = await this.getTokens(userId, provider);
      
      if (!currentTokens || !currentTokens.refreshToken) {
        throw new Error(`No refresh token available for ${provider}`);
      }

      if (provider === 'google') {
        const oauth2Client = this.getGoogleOAuth2Client();
        oauth2Client.setCredentials({ 
          refresh_token: currentTokens.refreshToken 
        });

        // Refresh the access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update stored tokens
        await this.storeTokens(userId, provider, {
          access_token: credentials.access_token,
          refresh_token: currentTokens.refreshToken, // Keep existing refresh token
          expiry_date: credentials.expiry_date,
          scope: currentTokens.scope
        });

        return {
          success: true,
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date
        };
      }

      throw new Error(`Token refresh not implemented for ${provider}`);
    } catch (error) {
      
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Check if access token needs refresh (expires within 5 minutes)
   * @param {Object} tokens - Token object
   * @returns {boolean} True if token needs refresh
   */
  needsRefresh(tokens) {
    if (!tokens || !tokens.expiryDate) {
      return false;
    }

    const expiryTime = new Date(tokens.expiryDate).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    return (expiryTime - currentTime) < fiveMinutes;
  }

  /**
   * Get valid access token, refreshing if necessary
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {Object} Valid token or error
   */
  async getValidAccessToken(userId, provider) {
    try {
      const tokens = await this.getTokens(userId, provider);
      
      if (!tokens) {
        return { 
          success: false, 
          error: 'No tokens found',
          requiresReauth: true 
        };
      }

      // Check if token needs refresh
      if (this.needsRefresh(tokens)) {
        console.log(`🔄 Refreshing ${provider} token for user ${userId}`);
        
        try {
          const refreshResult = await this.refreshAccessToken(userId, provider);
          return {
            success: true,
            accessToken: refreshResult.accessToken,
            refreshed: true
          };
        } catch (refreshError) {
          
          return {
            success: false,
            error: 'Token refresh failed',
            requiresReauth: true
          };
        }
      }

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshed: false
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message,
        requiresReauth: true
      };
    }
  }

  // =====================================================
  // SERVICE CONNECTION STATUS
  // =====================================================

  /**
   * Get OAuth connection status for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of OAuth connection statuses
   */
  async getOAuthConnections(userId) {
    try {
      const connections = [];

      for (const provider of this.supportedProviders) {
        const tokens = await this.getTokens(userId, provider);
        
        if (tokens) {
          const isExpired = tokens.expiryDate && new Date(tokens.expiryDate) < new Date();
          const needsRefresh = this.needsRefresh(tokens);
          
          connections.push({
            service: provider,
            status: isExpired ? 'expired' : (needsRefresh ? 'needs_refresh' : 'active'),
            connected_at: tokens.createdAt,
            expires_at: tokens.expiryDate,
            has_refresh_token: !!tokens.refreshToken,
            scope: tokens.scope
          });
        }
      }

      return connections;
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Check if user has active connection to a specific provider
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {boolean} True if user has active connection
   */
  async hasActiveConnection(userId, provider) {
    try {
      const tokenResult = await this.getValidAccessToken(userId, provider);
      return tokenResult.success;
    } catch (error) {
      
      return false;
    }
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  /**
   * Revoke OAuth connection and remove tokens
   * @param {string} userId - User ID
   * @param {string} provider - OAuth provider
   * @returns {Object} Revocation result
   */
  async revokeConnection(userId, provider) {
    try {
      const tokens = await this.getTokens(userId, provider);
      
      if (!tokens) {
        return { success: true, message: 'No connection found to revoke' };
      }

      // Revoke tokens with the provider if possible
      if (provider === 'google' && tokens.accessToken) {
        try {
          const oauth2Client = this.getGoogleOAuth2Client();
          await oauth2Client.revokeToken(tokens.accessToken);
          
        } catch (revokeError) {
          console.warn(`⚠️ Failed to revoke tokens with ${provider}:`, revokeError.message);
          // Continue with local deletion even if remote revocation fails
        }
      }

      // Remove tokens from database
      // Note: This would need a deleteCredentials method in databaseOperations
      // For now, we'll update with null values
      await databaseOperations.storeCredentials(userId, provider, null, null, null, null);

      return { 
        success: true, 
        message: `${provider} connection revoked successfully` 
      };
    } catch (error) {
      
      throw new Error(`Failed to revoke connection: ${error.message}`);
    }
  }
}

// Create singleton instance
const oauthService = new OAuthService();

module.exports = {
  oauthService,
  OAuthService
};

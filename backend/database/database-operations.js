/**
 * High-level database operations that work with both REST API and PostgreSQL
 * This provides a unified interface regardless of the connection method
 */

const { initDb, getDb, createDbManager } = require('./unified-connection');
const { hashRefreshToken } = require('../utils/jwt');
const redisManager = require('../services/redis-connection-manager');

class DatabaseOperations {
  constructor() {
    this.dbManager = null;
    this._initialized = false;
  }

  async _ensureInitialized() {
    if (!this._initialized) {
      try {
        this.dbManager = await initDb();
        this._initialized = true;
      } catch (error) {
        // Fallback to creating a new manager for tests
        this.dbManager = createDbManager();
        await this.dbManager.initialize();
        this._initialized = true;
      }
    }
  }

  /**
   * Get the appropriate client (REST or PostgreSQL)
   */
  async getClient() {
    await this._ensureInitialized();
    await this.dbManager.initialize();
    
    if (this.dbManager.useRestApi && this.dbManager.restClient) {
      return {
        type: 'REST_API',
        client: this.dbManager.restClient
      };
    } else {
      return {
        type: 'POSTGRESQL',
        client: this.dbManager
      };
    }
  }

  // =====================================================
  // USER MANAGEMENT
  // =====================================================

  async createUser(userData) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .insert(userData)
        .select()
        .single();
    } else {
      // PostgreSQL implementation - support all user fields including verification
      const fields = Object.keys(userData).filter(key => key !== 'created_at');
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      const fieldNames = fields.join(', ');

      const query = `
        INSERT INTO users (${fieldNames}, created_at)
        VALUES (${placeholders}, NOW())
        RETURNING *
      `;
      const values = fields.map(field => userData[field]);
      const result = await client.query(query, values);
      return { data: result.rows[0], error: null };
    }
  }

  async getUserById(userId) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [userId]);
      return { 
        data: result.rows[0] || null, 
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null 
      };
    }
  }

  async getUserByEmail(email) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email.toLowerCase()]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async updateUser(userId, updates) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      const values = [userId, ...Object.values(updates)];
      const result = await client.query(query, values);
      return { data: result.rows[0], error: null };
    }
  }

  // =====================================================
  // USER CONNECTIONS (OAuth Providers)
  // =====================================================

  /**
   * Store OAuth provider tokens (encrypted)
   * @param {string} userId - User ID
   * @param {string} provider - Provider name ('google' | 'microsoft')
   * @param {object} tokenData - Token data object
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async upsertProviderTokens(userId, provider, tokenData) {
    try {
      const { encrypt } = require('../utils/encryption');
      const { type, client } = await this.getClient();

      const encryptedData = {
        user_id: userId,
        provider: provider,
        sub: tokenData.sub,
        access_token_enc: encrypt(tokenData.access_token),
        refresh_token_enc: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
        scope: tokenData.scope || [],
        expiry_at: tokenData.expiry_at,
        updated_at: new Date().toISOString()
      };

      if (type === 'REST_API') {
        const response = await client.upsert('user_connections', encryptedData, {
          onConflict: 'user_id,provider'
        });
        return { success: true, data: response.data };
      } else {
        const query = `
          INSERT INTO user_connections (user_id, provider, sub, access_token_enc, refresh_token_enc, scope, expiry_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, provider)
          DO UPDATE SET
            sub = EXCLUDED.sub,
            access_token_enc = EXCLUDED.access_token_enc,
            refresh_token_enc = EXCLUDED.refresh_token_enc,
            scope = EXCLUDED.scope,
            expiry_at = EXCLUDED.expiry_at,
            updated_at = EXCLUDED.updated_at
          RETURNING *
        `;
        const result = await client.query(query, [
          userId, provider, tokenData.sub, encryptedData.access_token_enc,
          encryptedData.refresh_token_enc, tokenData.scope, tokenData.expiry_at, encryptedData.updated_at
        ]);
        return { success: true, data: result.rows[0] };
      }
    } catch (error) {
      console.error('Error upserting provider tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get OAuth connection for user and provider
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getConnection(userId, provider) {
    try {
      const { decrypt } = require('../utils/encryption');
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        const response = await client.get('user_connections', {
          user_id: `eq.${userId}`,
          provider: `eq.${provider}`
        });

        if (response.data && response.data.length > 0) {
          const connection = response.data[0];
          // Decrypt tokens
          connection.access_token = decrypt(connection.access_token_enc);
          if (connection.refresh_token_enc) {
            connection.refresh_token = decrypt(connection.refresh_token_enc);
          }
          delete connection.access_token_enc;
          delete connection.refresh_token_enc;
          return { success: true, data: connection };
        }
        return { success: true, data: null };
      } else {
        const query = `
          SELECT user_id, provider, sub, access_token_enc, refresh_token_enc, scope, expiry_at, created_at, updated_at
          FROM user_connections
          WHERE user_id = $1 AND provider = $2
        `;
        const result = await client.query(query, [userId, provider]);

        if (result.rows.length > 0) {
          const connection = result.rows[0];
          // Decrypt tokens
          connection.access_token = decrypt(connection.access_token_enc);
          if (connection.refresh_token_enc) {
            connection.refresh_token = decrypt(connection.refresh_token_enc);
          }
          delete connection.access_token_enc;
          delete connection.refresh_token_enc;
          return { success: true, data: connection };
        }
        return { success: true, data: null };
      }
    } catch (error) {
      console.error('Error getting connection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete OAuth connection
   * @param {string} userId - User ID
   * @param {string} provider - Provider name
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteConnection(userId, provider) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        await client.delete('user_connections', {
          user_id: `eq.${userId}`,
          provider: `eq.${provider}`
        });
        return { success: true };
      } else {
        const query = `DELETE FROM user_connections WHERE user_id = $1 AND provider = $2`;
        await client.query(query, [userId, provider]);
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set onboarding provider connection flag
   * @param {string} userId - User ID
   * @param {string} provider - Provider name ('google' | 'microsoft')
   * @param {boolean} connected - Connection status
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setOnboardingProviderFlag(userId, provider, connected) {
    try {
      const currentState = await this.getOnboardingState(userId);
      if (!currentState.success) {
        return currentState;
      }

      const flagName = provider === 'google' ? 'gmailConnected' : 'outlookConnected';
      const updatedData = {
        ...currentState.data.data,
        [flagName]: connected
      };

      return await this.upsertOnboardingPatch(userId, currentState.data.step, updatedData);
    } catch (error) {
      console.error('Error setting onboarding provider flag:', error);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // CREDENTIALS MANAGEMENT (Legacy)
  // =====================================================

  async storeCredentials(userId, serviceName, accessToken, refreshToken = null, expiryDate = null, scope = null) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.storeCredentials(userId, serviceName, accessToken, refreshToken, expiryDate, scope);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.storeCredentials(userId, serviceName, accessToken, refreshToken, expiryDate, scope);
    }
  }

  async getCredentials(userId, serviceName) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getCredentials(userId, serviceName);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.getCredentials(userId, serviceName);
    }
  }

  // =====================================================
  // BUSINESS CONFIGURATION
  // =====================================================

  async storeBusinessConfig(userId, configData) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.storeBusinessConfig(userId, configData);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.storeBusinessConfig(userId, configData);
    }
  }

  async getBusinessConfig(userId) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getBusinessConfig(userId);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.getBusinessConfig(userId);
    }
  }

  // =====================================================
  // ONBOARDING PROGRESS
  // =====================================================

  async updateOnboardingProgress(userId, currentStep, completedSteps, stepData, googleConnected = false, workflowDeployed = false) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.updateOnboardingProgress(userId, currentStep, completedSteps, stepData, googleConnected, workflowDeployed);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.updateOnboardingProgress(userId, currentStep, completedSteps, stepData, googleConnected, workflowDeployed);
    }
  }

  async getOnboardingProgress(userId) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getOnboardingProgress(userId);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.getOnboardingProgress(userId);
    }
  }

  // =====================================================
  // ANALYTICS
  // =====================================================

  async trackEvent(userId, eventType, eventData, sessionId = null, ipAddress = null, userAgent = null) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.trackEvent(userId, eventType, eventData, sessionId, ipAddress, userAgent);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.trackEvent(userId, eventType, eventData, sessionId, ipAddress, userAgent);
    }
  }

  // =====================================================
  // WORKFLOW DEPLOYMENTS
  // =====================================================

  async storeWorkflowDeployment(userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, deploymentData) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.storeWorkflowDeployment(userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, deploymentData);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.storeWorkflowDeployment(userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, deploymentData);
    }
  }

  async getWorkflowDeployments(userId) {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.getWorkflowDeployments(userId);
    } else {
      // Use the existing PostgreSQL method
      const supabaseClient = require('./supabase-client');
      const supabaseInstance = new supabaseClient();
      return await supabaseInstance.getWorkflowDeployments(userId);
    }
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================

  async healthCheck() {
    const { type, client } = await this.getClient();
    
    if (type === 'REST_API') {
      return await client.testConnection();
    } else {
      return await client.testConnection();
    }
  }

  // =====================================================
  // BUSINESS CONFIGURATION
  // =====================================================

  async getBusinessTypes() {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('business_types')
        .select('*')
        .eq('is_active', true)
        .order('name');
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM business_types WHERE is_active = true ORDER BY name';
      const result = await client.query(query);
      return { data: result.rows, error: null };
    }
  }

  async getBusinessTypeBySlug(slug) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('business_types')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM business_types WHERE slug = $1 AND is_active = true';
      const result = await client.query(query, [slug]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async getBusinessTypeById(id) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('business_types')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM business_types WHERE id = $1 AND is_active = true';
      const result = await client.query(query, [id]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async createBusinessType(businessTypeData) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('business_types')
        .insert(businessTypeData)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        INSERT INTO business_types (id, name, description, slug, default_categories, workflow_template_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;
      const values = [
        businessTypeData.id,
        businessTypeData.name,
        businessTypeData.description,
        businessTypeData.slug,
        JSON.stringify(businessTypeData.default_categories),
        businessTypeData.workflow_template_id
      ];
      const result = await client.query(query, values);
      return { data: result.rows[0], error: null };
    }
  }

  async deleteBusinessType(businessTypeId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('business_types')
        .delete()
        .eq('id', businessTypeId);
    } else {
      // PostgreSQL implementation
      const query = 'DELETE FROM business_types WHERE id = $1';
      const result = await client.query(query, [businessTypeId]);
      return { data: null, error: null };
    }
  }

  async deleteUser(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .delete()
        .eq('id', userId);
    } else {
      // PostgreSQL implementation
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await client.query(query, [userId]);
      return { data: null, error: null };
    }
  }

  async updateUserBusinessType(userId, businessTypeId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update({
          business_type_id: businessTypeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE users
        SET business_type_id = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(query, [businessTypeId, userId]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { message: 'User not found' } : null
      };
    }
  }

  async updateOnboardingProgress(userId, stepData) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      // First try to get existing progress
      const existing = await client.getAdminClient()
        .from('onboarding_progress')
        .select('step_data')
        .eq('user_id', userId)
        .single();

      let mergedData = stepData;
      if (!existing.error && existing.data) {
        // Merge with existing data
        mergedData = { ...existing.data.step_data, ...stepData };
      }

      // Upsert the progress
      return await client.getAdminClient()
        .from('onboarding_progress')
        .upsert({
          user_id: userId,
          step_data: mergedData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        INSERT INTO onboarding_progress (user_id, step_data, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          step_data = jsonb_set(
            COALESCE(onboarding_progress.step_data, '{}'::jsonb),
            '{business-type}',
            $2->'business-type'
          ),
          updated_at = NOW()
        RETURNING *
      `;
      const result = await client.query(query, [userId, JSON.stringify(stepData)]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  // =====================================================
  // CONNECTION INFO
  // =====================================================

  getConnectionInfo() {
    return {
      useRestApi: this.dbManager.useRestApi,
      isInitialized: this.dbManager.isInitialized,
      connectionMethod: this.dbManager.useRestApi ? 'Supabase REST API' : 'PostgreSQL Direct',
      status: this.dbManager.isInitialized ? 'Connected' : 'Not Connected'
    };
  }

  // PASSWORD RESET OPERATIONS
  // =====================================================

  async getUserByEmailForPasswordReset(email) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .select('id, email, first_name')
        .eq('email', email.toLowerCase())
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT id, email, first_name FROM users WHERE email = $1';
      const result = await client.query(query, [email.toLowerCase()]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async createPasswordResetToken(userId, token, expiresAt) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await client.query(query, [userId, token, expiresAt]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  async getPasswordResetToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('password_reset_tokens')
        .select(`
          *,
          users!inner(id, email, first_name)
        `)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT prt.*, u.id as user_id, u.email, u.first_name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `;
      const result = await client.query(query, [token]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async validatePasswordResetToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('password_reset_tokens')
        .select(`
          *,
          users!inner(id, email, first_name)
        `)
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT prt.*, u.id as user_id, u.email, u.first_name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()
      `;
      const result = await client.query(query, [token]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'Token not found or expired' } : null
      };
    }
  }

  async markPasswordResetTokenUsed(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('password_reset_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE password_reset_tokens
        SET used = true, used_at = NOW()
        WHERE token = $1
        RETURNING *
      `;
      const result = await client.query(query, [token]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  async updateUserPassword(userId, hashedPassword) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, first_name
      `;
      const result = await client.query(query, [hashedPassword, userId]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  // EMAIL VERIFICATION OPERATIONS
  // =====================================================

  async getEmailVerificationToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('email_verification_tokens')
        .select(`
          *,
          users!inner(id, email, first_name)
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT evt.user_id, u.email, u.first_name
        FROM email_verification_tokens evt
        JOIN users u ON evt.user_id = u.id
        WHERE evt.token = $1 AND evt.expires_at > CURRENT_TIMESTAMP
      `;
      const result = await client.query(query, [token]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async markEmailAsVerified(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
      const result = await client.query(query, [userId]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  async deleteEmailVerificationToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('email_verification_tokens')
        .delete()
        .eq('token', token);
    } else {
      // PostgreSQL implementation
      const query = 'DELETE FROM email_verification_tokens WHERE token = $1';
      const result = await client.query(query, [token]);
      return { data: null, error: null };
    }
  }

  async createEmailVerificationToken(userId, token, expiresAt) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('email_verification_tokens')
        .insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await client.query(query, [userId, token, expiresAt]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  // USER PROFILE OPERATIONS
  // =====================================================

  async getUserProfile(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .select('id, email, first_name, last_name, company_name, created_at, last_login, email_verified')
        .eq('id', userId)
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT id, email, first_name, last_name, company_name, created_at, last_login, email_verified
        FROM users
        WHERE id = $1
      `;
      const result = await client.query(query, [userId]);
      return {
        data: result.rows[0] || null,
        error: result.rows.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null
      };
    }
  }

  async updateUserProfile(userId, profileData) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const fields = Object.keys(profileData);
      const values = Object.values(profileData);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

      const query = `
        UPDATE users
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, first_name, last_name, company_name, created_at, last_login, email_verified
      `;
      const result = await client.query(query, [userId, ...values]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  // USER SETTINGS OPERATIONS
  // =====================================================

  async getUserSettings(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      const result = await client.getAdminClient()
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      return {
        data: result.data?.settings || null,
        error: result.error
      };
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT settings
        FROM user_settings
        WHERE user_id = $1
      `;
      const result = await client.query(query, [userId]);
      return {
        data: result.rows[0]?.settings || null,
        error: result.rows.length === 0 ? null : null // No error if no settings found
      };
    }
  }

  async updateUserSettings(userId, settingsData) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      // First try to update existing settings
      const updateResult = await client.getAdminClient()
        .from('user_settings')
        .update({
          settings: settingsData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      // If no rows were updated, insert new settings
      if (updateResult.data && updateResult.data.length === 0) {
        const insertResult = await client.getAdminClient()
          .from('user_settings')
          .insert({
            user_id: userId,
            settings: settingsData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        return insertResult;
      }

      return updateResult;
    } else {
      // PostgreSQL implementation - use UPSERT
      const query = `
        INSERT INTO user_settings (user_id, settings, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          settings = $2,
          updated_at = NOW()
        RETURNING user_id, settings, updated_at
      `;
      const result = await client.query(query, [userId, JSON.stringify(settingsData)]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  async getUserConnectedServices(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      // Try to get credentials - handle gracefully if table doesn't exist
      try {
        const result = await client.getAdminClient()
          .from('credentials')
          .select('service_name, created_at, expiry_date')
          .eq('user_id', userId);

        return {
          data: result.data || [],
          error: result.error
        };
      } catch (error) {
        console.log('Credentials table not accessible, returning empty array');
        return { data: [], error: null };
      }
    } else {
      // PostgreSQL implementation
      try {
        const query = `
          SELECT service_name, created_at, expiry_date
          FROM credentials
          WHERE user_id = $1
        `;
        const result = await client.query(query, [userId]);
        return { data: result.rows, error: null };
      } catch (error) {
        console.log('Credentials table not found, returning empty array');
        return { data: [], error: null };
      }
    }
  }

  // =====================================================
  // PASSWORD RESET OPERATIONS
  // =====================================================

  /**
   * Create password reset token with hashed storage
   * @param {string} userId - User ID
   * @param {number} ttlMinutes - Time to live in minutes (default: 60)
   * @returns {Object} { token } - Returns raw token; stores hash + expiresAt
   */
  async createPasswordResetToken(userId, ttlMinutes = 60) {
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      const result = await client.getAdminClient()
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          token: tokenHash, // Use 'token' column, not 'token_hash'
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (result.error) {
        throw new Error(`Failed to create reset token: ${result.error.message}`);
      }
    } else {
      // PostgreSQL implementation
      const query = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;
      const result = await client.query(query, [userId, tokenHash, expiresAt.toISOString()]);
      if (result.rows.length === 0) {
        throw new Error('Failed to create reset token');
      }
    }

    return { token: rawToken };
  }

  /**
   * Consume password reset token (single-use)
   * @param {string} rawToken - Raw token from user
   * @returns {Object} { userId } or throws
   */
  async consumePasswordResetToken(rawToken) {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      // First, find and validate the token
      const tokenResult = await client.getAdminClient()
        .from('password_reset_tokens')
        .select('user_id, expires_at, used')
        .eq('token', tokenHash) // Use 'token' column
        .single();

      if (tokenResult.error || !tokenResult.data) {
        throw new Error('INVALID_TOKEN');
      }

      const token = tokenResult.data;

      if (token.used) {
        throw new Error('TOKEN_EXPIRED');
      }

      if (new Date(token.expires_at) < new Date()) {
        throw new Error('TOKEN_EXPIRED');
      }

      // Mark token as used
      const updateResult = await client.getAdminClient()
        .from('password_reset_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', tokenHash); // Use 'token' column

      if (updateResult.error) {
        throw new Error('Failed to consume token');
      }

      return { userId: token.user_id };
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE password_reset_tokens
        SET used = true, used_at = NOW()
        WHERE token = $1 AND used = false AND expires_at > NOW()
        RETURNING user_id
      `;
      const result = await client.query(query, [tokenHash]);

      if (result.rows.length === 0) {
        // Check if token exists but is expired/used
        const checkQuery = `
          SELECT expires_at, used FROM password_reset_tokens WHERE token = $1
        `;
        const checkResult = await client.query(checkQuery, [tokenHash]);

        if (checkResult.rows.length === 0) {
          throw new Error('INVALID_TOKEN');
        } else {
          throw new Error('TOKEN_EXPIRED');
        }
      }

      return { userId: result.rows[0].user_id };
    }
  }

  /**
   * Set user password
   * @param {string} userId - User ID
   * @param {string} passwordHash - Bcrypt password hash
   */
  async setUserPassword(userId, passwordHash) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      const result = await client.getAdminClient()
        .from('users')
        .update({
          password_hash: passwordHash,
          last_password_reset: new Date().toISOString() // Use correct column name
        })
        .eq('id', userId);

      if (result.error) {
        throw new Error(`Failed to update password: ${result.error.message}`);
      }
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE users
        SET password_hash = $1, last_password_reset = NOW()
        WHERE id = $2
      `;
      await client.query(query, [passwordHash, userId]);
    }
  }

  /**
   * Invalidate all reset tokens for a user
   * @param {string} userId - User ID
   */
  async invalidateUserResetTokens(userId) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      await client.getAdminClient()
        .from('password_reset_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('used', false);
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE password_reset_tokens
        SET used = true, used_at = NOW()
        WHERE user_id = $1 AND used = false
      `;
      await client.query(query, [userId]);
    }
  }

  // =====================================================
  // REFRESH TOKEN OPERATIONS
  // =====================================================

  /**
   * Create a refresh token for a user
   * @param {string} userId - User ID
   * @param {string} rawToken - Raw refresh token
   * @param {number} ttlDays - TTL in days (default: 30)
   * @returns {Promise<{error?: string, data?: boolean}>}
   */
  async createRefreshToken(userId, rawToken, ttlDays = 30) {
    try {
      const tokenHash = hashRefreshToken(rawToken);
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

      // Try KeyDB first
      try {
        const client = await redisManager.getClient();
        if (client) {
          const tokenData = {
            userId,
            exp: expiresAt.getTime(),
            used: false,
            createdAt: Date.now()
          };

          const key = `refresh:${tokenHash}`;
          const ttlSeconds = ttlDays * 24 * 60 * 60;

          await client.setex(key, ttlSeconds, JSON.stringify(tokenData));
          return { data: true };
        }
      } catch (redisError) {
        console.warn('KeyDB unavailable for refresh token, falling back to database');
      }

      // Fallback to database - use users table with JSONB field as temporary solution
      await this._ensureInitialized();

      if (this.dbManager.client) {
        // Direct PostgreSQL - try to use refresh_tokens table
        const query = `
          INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, used_at)
          VALUES ($1, $2, $3, $4, NULL)
          ON CONFLICT (token_hash) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at,
            used_at = NULL
        `;
        await this.dbManager.client.query(query, [userId, tokenHash, expiresAt, new Date()]);
      } else {
        // Supabase REST API fallback - store in users table preferences field
        const tokenData = {
          hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          used_at: null
        };

        // Get current user preferences
        const { data: userData, error: getUserError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single();

        if (getUserError) throw getUserError;

        const preferences = userData.preferences || {};
        preferences.refresh_tokens = preferences.refresh_tokens || {};
        preferences.refresh_tokens[tokenHash] = tokenData;

        // Update user preferences
        const { error: updateError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .update({ preferences })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return { data: true };
    } catch (error) {
      console.error('Error creating refresh token:', error);
      return { error: error.message };
    }
  }

  /**
   * Find a refresh token by raw token
   * @param {string} rawToken - Raw refresh token
   * @returns {Promise<{error?: string, data?: {userId: string, used: boolean, exp: number}}>}
   */
  async findRefreshToken(rawToken) {
    try {
      const tokenHash = hashRefreshToken(rawToken);

      // Try KeyDB first
      try {
        const client = await redisManager.getClient();
        if (client) {
          const key = `refresh:${tokenHash}`;
          const data = await client.get(key);

          if (data) {
            const tokenData = JSON.parse(data);
            return {
              data: {
                userId: tokenData.userId,
                used: tokenData.used,
                exp: tokenData.exp
              }
            };
          }
          // Token not found in KeyDB, fall through to database
        }
      } catch (redisError) {
        console.warn('KeyDB unavailable for refresh token lookup, falling back to database');
      }

      // Fallback to database
      await this._ensureInitialized();

      if (this.dbManager.client) {
        // Direct PostgreSQL - try refresh_tokens table
        const query = `
          SELECT user_id, expires_at, used_at
          FROM refresh_tokens
          WHERE token_hash = $1
        `;
        const result = await this.dbManager.client.query(query, [tokenHash]);
        const row = result.rows[0];

        if (!row) {
          return { data: null };
        }

        return {
          data: {
            userId: row.user_id,
            used: !!row.used_at,
            exp: new Date(row.expires_at).getTime()
          }
        };
      } else {
        // Supabase REST API fallback - search in users table preferences
        const { data: users, error } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .select('id, preferences')
          .not('preferences', 'is', null);

        if (error) throw error;

        // Search through all users' preferences for the token hash
        for (const user of users) {
          const preferences = user.preferences || {};
          const refreshTokens = preferences.refresh_tokens || {};

          if (refreshTokens[tokenHash]) {
            const tokenData = refreshTokens[tokenHash];
            return {
              data: {
                userId: user.id,
                used: !!tokenData.used_at,
                exp: new Date(tokenData.expires_at).getTime()
              }
            };
          }
        }

        return { data: null };
      }
    } catch (error) {
      console.error('Error finding refresh token:', error);
      return { error: error.message };
    }
  }

  /**
   * Rotate a refresh token (mark old as used, create new one)
   * @param {string} oldRawToken - Old refresh token
   * @param {string} newRawToken - New refresh token
   * @param {number} ttlDays - TTL in days
   * @returns {Promise<{error?: string, data?: {userId: string}}>}
   */
  async rotateRefreshToken(oldRawToken, newRawToken, ttlDays = 30) {
    try {
      const oldTokenHash = hashRefreshToken(oldRawToken);
      const newTokenHash = hashRefreshToken(newRawToken);

      // Try KeyDB first
      try {
        const client = await redisManager.getClient();
        if (client) {
          const oldKey = `refresh:${oldTokenHash}`;
          const newKey = `refresh:${newTokenHash}`;

          // Use transaction for atomicity
          const multi = client.multi();

          // Get old token data
          const oldData = await client.get(oldKey);
          if (!oldData) {
            return { error: 'Refresh token not found' };
          }

          const tokenData = JSON.parse(oldData);

          // Check if already used
          if (tokenData.used) {
            return { error: 'Refresh token already used' };
          }

          // Check if expired
          if (Date.now() > tokenData.exp) {
            return { error: 'Refresh token expired' };
          }

          // Mark old token as used
          tokenData.used = true;
          multi.setex(oldKey, Math.ceil((tokenData.exp - Date.now()) / 1000), JSON.stringify(tokenData));

          // Create new token
          const newTokenData = {
            userId: tokenData.userId,
            exp: Date.now() + ttlDays * 24 * 60 * 60 * 1000,
            used: false,
            createdAt: Date.now()
          };

          const ttlSeconds = ttlDays * 24 * 60 * 60;
          multi.setex(newKey, ttlSeconds, JSON.stringify(newTokenData));

          await multi.exec();

          return { data: { userId: tokenData.userId } };
        }
      } catch (redisError) {
        console.warn('KeyDB unavailable for refresh token rotation, falling back to database');
      }

      // Fallback to database (simplified - mark old as used, insert new)
      await this._ensureInitialized();

      // First, get and validate old token
      const oldTokenResult = await this.findRefreshToken(oldRawToken);
      if (oldTokenResult.error) {
        return { error: oldTokenResult.error };
      }

      if (!oldTokenResult.data) {
        return { error: 'Refresh token not found' };
      }

      if (oldTokenResult.data.used) {
        return { error: 'Refresh token already used' };
      }

      if (Date.now() > oldTokenResult.data.exp) {
        return { error: 'Refresh token expired' };
      }

      const userId = oldTokenResult.data.userId;

      // Mark old token as used and create new one
      if (this.dbManager.client) {
        await this.dbManager.client.query('BEGIN');
        try {
          // Mark old as used
          await this.dbManager.client.query(
            'UPDATE refresh_tokens SET used_at = $1 WHERE token_hash = $2',
            [new Date(), oldTokenHash]
          );

          // Create new token
          const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
          await this.dbManager.client.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4)',
            [userId, newTokenHash, expiresAt, new Date()]
          );

          await this.dbManager.client.query('COMMIT');
        } catch (error) {
          await this.dbManager.client.query('ROLLBACK');
          throw error;
        }
      } else {
        // Supabase REST API fallback - update in users table preferences
        const { data: userData, error: getUserError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single();

        if (getUserError) throw getUserError;

        const preferences = userData.preferences || {};
        const refreshTokens = preferences.refresh_tokens || {};

        // Mark old token as used
        if (refreshTokens[oldTokenHash]) {
          refreshTokens[oldTokenHash].used_at = new Date().toISOString();
        }

        // Create new token
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
        refreshTokens[newTokenHash] = {
          hash: newTokenHash,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          used_at: null
        };

        preferences.refresh_tokens = refreshTokens;

        // Update user preferences
        const { error: updateError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .update({ preferences })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return { data: { userId } };
    } catch (error) {
      console.error('Error rotating refresh token:', error);
      return { error: error.message };
    }
  }

  /**
   * Revoke a refresh token
   * @param {string} rawToken - Raw refresh token
   * @returns {Promise<{error?: string, data?: boolean}>}
   */
  async revokeRefreshToken(rawToken) {
    try {
      const tokenHash = hashRefreshToken(rawToken);

      // Try KeyDB first
      try {
        const client = await redisManager.getClient();
        if (client) {
          const key = `refresh:${tokenHash}`;
          await client.del(key);
          return { data: true };
        }
      } catch (redisError) {
        console.warn('KeyDB unavailable for refresh token revocation, falling back to database');
      }

      // Fallback to database
      await this._ensureInitialized();

      if (this.dbManager.client) {
        await this.dbManager.client.query(
          'UPDATE refresh_tokens SET used_at = $1 WHERE token_hash = $2',
          [new Date(), tokenHash]
        );
      } else {
        // Supabase REST API fallback - find and update in users table preferences
        const { data: users, error } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .select('id, preferences')
          .not('preferences', 'is', null);

        if (error) throw error;

        // Search through all users' preferences for the token hash
        for (const user of users) {
          const preferences = user.preferences || {};
          const refreshTokens = preferences.refresh_tokens || {};

          if (refreshTokens[tokenHash]) {
            refreshTokens[tokenHash].used_at = new Date().toISOString();

            // Update user preferences
            const { error: updateError } = await this.dbManager.restClient.getAdminClient()
              .from('users')
              .update({ preferences })
              .eq('id', user.id);

            if (updateError) throw updateError;
            break;
          }
        }
      }

      return { data: true };
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      return { error: error.message };
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<{error?: string, data?: boolean}>}
   */
  async revokeAllRefreshTokensForUser(userId) {
    try {
      // Try KeyDB first - scan for user's tokens
      try {
        const client = await redisManager.getClient();
        if (client) {
          const keys = await client.keys('refresh:*');
          const userKeys = [];

          for (const key of keys) {
            const data = await client.get(key);
            if (data) {
              const tokenData = JSON.parse(data);
              if (tokenData.userId === userId) {
                userKeys.push(key);
              }
            }
          }

          if (userKeys.length > 0) {
            await client.del(...userKeys);
          }

          return { data: true };
        }
      } catch (redisError) {
        console.warn('KeyDB unavailable for bulk refresh token revocation, falling back to database');
      }

      // Fallback to database
      await this._ensureInitialized();

      if (this.dbManager.client) {
        await this.dbManager.client.query(
          'UPDATE refresh_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL',
          [new Date(), userId]
        );
      } else {
        // Supabase REST API fallback - update in users table preferences
        const { data: userData, error: getUserError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .select('preferences')
          .eq('id', userId)
          .single();

        if (getUserError) throw getUserError;

        const preferences = userData.preferences || {};
        const refreshTokens = preferences.refresh_tokens || {};

        // Mark all user's refresh tokens as used
        for (const tokenHash in refreshTokens) {
          if (refreshTokens[tokenHash] && !refreshTokens[tokenHash].used_at) {
            refreshTokens[tokenHash].used_at = new Date().toISOString();
          }
        }

        preferences.refresh_tokens = refreshTokens;

        // Update user preferences
        const { error: updateError } = await this.dbManager.restClient.getAdminClient()
          .from('users')
          .update({ preferences })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return { data: true };
    } catch (error) {
      console.error('Error revoking all refresh tokens for user:', error);
      return { error: error.message };
    }
  }

  // =====================================================
  // ONBOARDING OPERATIONS
  // =====================================================

  /**
   * Get user's onboarding state
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getOnboardingState(userId) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        const response = await client.get('onboarding_states', {
          select: 'user_id,step,data,completed_at,created_at,updated_at',
          user_id: `eq.${userId}`,
          limit: 1
        });

        if (response.length === 0) {
          // Return default state for new users
          return {
            success: true,
            data: {
              user_id: userId,
              step: 1,
              data: {},
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
        }

        return {
          success: true,
          data: response[0]
        };
      } else {
        const query = `
          SELECT user_id, step, data, completed_at, created_at, updated_at
          FROM onboarding_states
          WHERE user_id = $1
        `;
        const result = await client.query(query, [userId]);

        if (result.rows.length === 0) {
          // Return default state for new users
          return {
            success: true,
            data: {
              user_id: userId,
              step: 1,
              data: {},
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
        }

        return {
          success: true,
          data: result.rows[0]
        };
      }
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user's onboarding state with patch data
   * @param {string} userId - User ID
   * @param {number} nextStep - Next step (1-4)
   * @param {object} patch - Data to merge into existing data
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async upsertOnboardingPatch(userId, nextStep, patch) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        // First get current state
        const currentState = await this.getOnboardingState(userId);
        if (!currentState.success) {
          return currentState;
        }

        // Merge patch data
        const mergedData = { ...currentState.data.data, ...patch };

        // Upsert the record
        const response = await client.upsert('onboarding_states', {
          user_id: userId,
          step: nextStep,
          data: mergedData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

        return {
          success: true,
          data: {
            user_id: userId,
            step: nextStep,
            data: mergedData,
            completed_at: currentState.data.completed_at,
            created_at: currentState.data.created_at,
            updated_at: new Date().toISOString()
          }
        };
      } else {
        const query = `
          INSERT INTO onboarding_states (user_id, step, data, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            step = EXCLUDED.step,
            data = onboarding_states.data || EXCLUDED.data,
            updated_at = NOW()
          RETURNING user_id, step, data, completed_at, created_at, updated_at
        `;
        const result = await client.query(query, [userId, nextStep, JSON.stringify(patch)]);

        return {
          success: true,
          data: result.rows[0]
        };
      }
    } catch (error) {
      console.error('Error upserting onboarding patch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete user's onboarding
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async completeOnboarding(userId) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        const response = await client.update('onboarding_states', {
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          user_id: `eq.${userId}`
        });

        // Get the updated record
        const updatedState = await this.getOnboardingState(userId);
        return updatedState;
      } else {
        const query = `
          UPDATE onboarding_states
          SET completed_at = NOW(), updated_at = NOW()
          WHERE user_id = $1
          RETURNING user_id, step, data, completed_at, created_at, updated_at
        `;
        const result = await client.query(query, [userId]);

        if (result.rows.length === 0) {
          return {
            success: false,
            error: 'Onboarding state not found'
          };
        }

        return {
          success: true,
          data: result.rows[0]
        };
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =====================================================
  // CLIENT CONFIG OPERATIONS
  // =====================================================

  /**
   * Get client configuration by client ID
   * @param {string} clientId - Client identifier
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getClientConfigRow(clientId) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        const response = await client.select('*').from('client_config').eq('client_id', clientId).single();

        if (response.error) {
          if (response.error.code === 'PGRST116') {
            // No rows found - this is expected for new clients
            return {
              success: false,
              error: 'Client config not found'
            };
          }
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: response.data
        };
      } else {
        const query = `
          SELECT client_id, version, config_json, updated_at
          FROM client_config
          WHERE client_id = $1
        `;
        const result = await client.query(query, [clientId]);

        if (result.rows.length === 0) {
          return {
            success: false,
            error: 'Client config not found'
          };
        }

        return {
          success: true,
          data: result.rows[0]
        };
      }
    } catch (error) {
      console.error('Error getting client config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Insert or update client configuration
   * @param {string} clientId - Client identifier
   * @param {number} version - Version number
   * @param {object} configJson - Configuration data
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async upsertClientConfigRow(clientId, version, configJson) {
    try {
      const { type, client } = await this.getClient();

      if (type === 'REST_API') {
        const response = await client.upsert({
          client_id: clientId,
          version: version,
          config_json: configJson,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'client_id'
        }).from('client_config');

        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: { client_id: clientId, version: version }
        };
      } else {
        const query = `
          INSERT INTO client_config (client_id, version, config_json, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (client_id)
          DO UPDATE SET
            version = EXCLUDED.version,
            config_json = EXCLUDED.config_json,
            updated_at = NOW()
          RETURNING client_id, version, updated_at
        `;
        const result = await client.query(query, [clientId, version, JSON.stringify(configJson)]);

        return {
          success: true,
          data: result.rows[0]
        };
      }
    } catch (error) {
      console.error('Error upserting client config:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const databaseOperations = new DatabaseOperations();

module.exports = {
  databaseOperations,
  DatabaseOperations
};

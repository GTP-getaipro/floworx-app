/**
 * High-level database operations that work with both REST API and PostgreSQL
 * This provides a unified interface regardless of the connection method
 */

const { databaseManager } = require('./unified-connection');

class DatabaseOperations {
  constructor() {
    this.dbManager = databaseManager;
  }

  /**
   * Get the appropriate client (REST or PostgreSQL)
   */
  async getClient() {
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
      // PostgreSQL implementation
      const query = `
        INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const values = [userData.id, userData.email, userData.password_hash, userData.first_name, userData.last_name];
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
  // CREDENTIALS MANAGEMENT
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

  // EMAIL VERIFICATION TOKEN OPERATIONS
  // =====================================================

  /**
   * Store verification token in database
   * @param {string} userId - User ID
   * @param {string} token - Verification token
   * @param {Date} expiresAt - Token expiration date
   * @returns {Promise<Object>} Result object
   */
  async storeVerificationToken(userId, token, expiresAt) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('verification_tokens')
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
        INSERT INTO verification_tokens (user_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await client.query(query, [userId, token, expiresAt]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  /**
   * Get verification token from database
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Result object with token data
   */
  async getVerificationToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('verification_tokens')
        .select('user_id, expires_at, created_at')
        .eq('token', token)
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        SELECT user_id, expires_at, created_at
        FROM verification_tokens
        WHERE token = $1
      `;
      const result = await client.query(query, [token]);
      return {
        data: result.rows.length > 0 ? result.rows[0] : null,
        error: null
      };
    }
  }

  /**
   * Update user's email verification status
   * @param {string} userId - User ID
   * @param {boolean} verified - Verification status
   * @returns {Promise<Object>} Result object
   */
  async updateUserEmailVerification(userId, verified) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('users')
        .update({
          email_verified: verified,
          email_verified_at: verified ? new Date().toISOString() : null
        })
        .eq('id', userId)
        .select()
        .single();
    } else {
      // PostgreSQL implementation
      const query = `
        UPDATE users
        SET email_verified = $1, email_verified_at = $2
        WHERE id = $3
        RETURNING *
      `;
      const result = await client.query(query, [
        verified,
        verified ? new Date().toISOString() : null,
        userId
      ]);
      return { data: result.rows[0] || null, error: null };
    }
  }

  /**
   * Delete verification token from database
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Result object
   */
  async deleteVerificationToken(token) {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('verification_tokens')
        .delete()
        .eq('token', token);
    } else {
      // PostgreSQL implementation
      const query = `DELETE FROM verification_tokens WHERE token = $1`;
      const result = await client.query(query, [token]);
      return { data: null, error: null };
    }
  }

  /**
   * Clean up expired verification tokens
   * @returns {Promise<Object>} Result object
   */
  async cleanupExpiredVerificationTokens() {
    const { type, client } = await this.getClient();

    if (type === 'REST_API') {
      return await client.getAdminClient()
        .from('verification_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } else {
      // PostgreSQL implementation
      const query = `DELETE FROM verification_tokens WHERE expires_at < NOW()`;
      const result = await client.query(query);
      return { data: { deletedCount: result.rowCount }, error: null };
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
}

// Create singleton instance
const databaseOperations = new DatabaseOperations();

module.exports = {
  databaseOperations,
  DatabaseOperations
};

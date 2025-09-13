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
        .eq('email', email)
        .single();
    } else {
      // PostgreSQL implementation
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
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
}

// Create singleton instance
const databaseOperations = new DatabaseOperations();

module.exports = {
  databaseOperations,
  DatabaseOperations
};

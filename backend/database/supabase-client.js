const crypto = require('crypto');

const { Pool } = require('pg');

// Supabase Database Connection with Transaction Pooler
class SupabaseClient {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      },
      // Optimized for serverless/transaction pooler
      max: 1, // Maximum connections for serverless
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0
    });

    this.encryptionKey = process.env.ENCRYPTION_KEY;

    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
  }

  // =====================================================
  // ENCRYPTION UTILITIES
  // =====================================================

  encrypt(text) {
    if (!text) {
      return null;
    }
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(this.encryptionKey.slice(0, 32), 'utf8');
    const cipher = crypto.createCipherGCM(algorithm, keyBuffer, iv);
    cipher.setAAD(Buffer.from('floworx-supabase', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    if (!encryptedText) {
      return null;
    }
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const keyBuffer = Buffer.from(this.encryptionKey.slice(0, 32), 'utf8');

    const decipher = crypto.createDecipherGCM(algorithm, keyBuffer, iv);
    decipher.setAAD(Buffer.from('floworx-supabase', 'utf8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // =====================================================
  // CREDENTIALS MANAGEMENT
  // =====================================================

  async storeCredentials(userId, serviceName, accessToken, refreshToken = null, expiryDate = null, scope = null) {
    const encryptedAccessToken = this.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? this.encrypt(refreshToken) : null;

    const query = `
      INSERT INTO public.credentials (user_id, service_name, access_token, refresh_token, expiry_date, scope)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, service_name) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expiry_date = EXCLUDED.expiry_date,
        scope = EXCLUDED.scope,
        updated_at = NOW()
      RETURNING id, created_at, updated_at
    `;

    const values = [userId, serviceName, encryptedAccessToken, encryptedRefreshToken, expiryDate, scope];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getCredentials(userId, serviceName) {
    const query = `
      SELECT access_token, refresh_token, expiry_date, scope, created_at, updated_at
      FROM public.credentials
      WHERE user_id = $1 AND service_name = $2
    `;

    const result = await this.pool.query(query, [userId, serviceName]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      accessToken: this.decrypt(row.access_token),
      refreshToken: row.refresh_token ? this.decrypt(row.refresh_token) : null,
      expiryDate: row.expiry_date,
      scope: row.scope,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =====================================================
  // BUSINESS CONFIGURATION MANAGEMENT
  // =====================================================

  async storeBusinessConfig(userId, configData) {
    // Deactivate previous configs
    await this.pool.query('UPDATE public.business_configs SET is_active = false WHERE user_id = $1', [userId]);

    // Insert new active config
    const query = `
      INSERT INTO public.business_configs (user_id, config_json, is_active)
      VALUES ($1, $2, true)
      RETURNING id, version, created_at
    `;

    const result = await this.pool.query(query, [userId, JSON.stringify(configData)]);
    return result.rows[0];
  }

  async getBusinessConfig(userId) {
    const query = `
      SELECT id, config_json, version, created_at, updated_at
      FROM public.business_configs
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      config: row.config_json,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // =====================================================
  // WORKFLOW DEPLOYMENT TRACKING
  // =====================================================

  async storeWorkflowDeployment(userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, deploymentData) {
    const query = `
      INSERT INTO public.workflow_deployments 
      (user_id, business_config_id, n8n_workflow_id, workflow_name, webhook_url, deployment_data, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, created_at
    `;

    const values = [userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, JSON.stringify(deploymentData)];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getWorkflowDeployments(userId) {
    const query = `
      SELECT wd.*, bc.config_json as business_config
      FROM public.workflow_deployments wd
      JOIN public.business_configs bc ON wd.business_config_id = bc.id
      WHERE wd.user_id = $1
      ORDER BY wd.created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      n8nWorkflowId: row.n8n_workflow_id,
      workflowName: row.workflow_name,
      webhookUrl: row.webhook_url,
      status: row.status,
      deploymentData: row.deployment_data,
      businessConfig: row.business_config,
      lastExecution: row.last_execution,
      executionCount: row.execution_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // =====================================================
  // ONBOARDING PROGRESS TRACKING
  // =====================================================

  async updateOnboardingProgress(
    userId,
    currentStep,
    completedSteps,
    stepData,
    googleConnected = false,
    workflowDeployed = false
  ) {
    const query = `
      INSERT INTO public.onboarding_progress 
      (user_id, current_step, completed_steps, step_data, google_connected, workflow_deployed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        current_step = EXCLUDED.current_step,
        completed_steps = EXCLUDED.completed_steps,
        step_data = EXCLUDED.step_data,
        google_connected = EXCLUDED.google_connected,
        workflow_deployed = EXCLUDED.workflow_deployed,
        onboarding_completed = (EXCLUDED.workflow_deployed = true),
        updated_at = NOW()
      RETURNING *
    `;

    const values = [userId, currentStep, completedSteps, JSON.stringify(stepData), googleConnected, workflowDeployed];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getOnboardingProgress(userId) {
    const query = `
      SELECT * FROM public.onboarding_progress WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // =====================================================
  // ANALYTICS TRACKING
  // =====================================================

  async trackEvent(userId, eventType, eventData, sessionId = null, ipAddress = null, userAgent = null) {
    const query = `
      INSERT INTO public.user_analytics 
      (user_id, event_type, event_data, session_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `;

    const values = [userId, eventType, JSON.stringify(eventData), sessionId, ipAddress, userAgent];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  // =====================================================
  // CONNECTION MANAGEMENT
  // =====================================================

  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time, version() as pg_version');
      return {
        success: true,
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = SupabaseClient;

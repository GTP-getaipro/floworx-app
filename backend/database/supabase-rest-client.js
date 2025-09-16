/**
 * Supabase REST API Client
 * Replaces direct PostgreSQL connections with Supabase REST API calls
 * This bypasses network connectivity issues by using HTTPS instead of PostgreSQL protocol
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

class SupabaseRestClient {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.encryptionKey = process.env.ENCRYPTION_KEY;

    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required');
    }

    if (!this.supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY environment variable is required');
    }

    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Client for user operations (with RLS)
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);

    // Admin client for service operations (bypasses RLS)
    if (this.supabaseServiceKey) {
      this.adminClient = createClient(this.supabaseUrl, this.supabaseServiceKey);
    }

    console.log('✅ Supabase REST API client initialized');
    console.log(`   URL: ${this.supabaseUrl}`);
    console.log(`   Using HTTPS REST API instead of direct PostgreSQL connection`);
  }

  // =====================================================
  // ENCRYPTION UTILITIES (same as original)
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

  /**
   * Get client with user context (RLS enabled)
   */
  getUserClient(accessToken = null) {
    if (accessToken) {
      this.client.auth.setSession({ access_token: accessToken });
    }
    return this.client;
  }

  /**
   * Get admin client (bypasses RLS)
   */
  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('Service role key not configured - cannot use admin client');
    }
    return this.adminClient;
  }

  // =====================================================
  // CREDENTIALS MANAGEMENT (converted to REST API)
  // =====================================================

  async storeCredentials(userId, serviceName, accessToken, refreshToken = null, expiryDate = null, scope = null) {
    try {
      const encryptedAccessToken = this.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? this.encrypt(refreshToken) : null;

      const { data, error } = await this.getAdminClient()
        .from('credentials')
        .upsert(
          {
            user_id: userId,
            service_name: serviceName,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            expiry_date: expiryDate,
            scope: scope,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,service_name',
            ignoreDuplicates: false
          }
        )
        .select('id, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Store credentials error:', error.message);
      throw error;
    }
  }

  async getCredentials(userId, serviceName) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('credentials')
        .select('access_token, refresh_token, expiry_date, scope, created_at, updated_at')
        .eq('user_id', userId)
        .eq('service_name', serviceName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        } // No rows found
        throw error;
      }

      return {
        accessToken: this.decrypt(data.access_token),
        refreshToken: data.refresh_token ? this.decrypt(data.refresh_token) : null,
        expiryDate: data.expiry_date,
        scope: data.scope,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('❌ Get credentials error:', error.message);
      throw error;
    }
  }

  // =====================================================
  // BUSINESS CONFIGURATION MANAGEMENT (converted to REST API)
  // =====================================================

  async storeBusinessConfig(userId, configData) {
    try {
      // First, deactivate previous configs
      await this.getAdminClient().from('business_configs').update({ is_active: false }).eq('user_id', userId);

      // Insert new active config
      const { data, error } = await this.getAdminClient()
        .from('business_configs')
        .insert({
          user_id: userId,
          config_json: configData,
          is_active: true
        })
        .select('id, version, created_at')
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Store business config error:', error.message);
      throw error;
    }
  }

  async getBusinessConfig(userId) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('business_configs')
        .select('id, config_json, version, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        } // No rows found
        throw error;
      }

      return {
        id: data.id,
        config: data.config_json,
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('❌ Get business config error:', error.message);
      // Return null instead of throwing to prevent dashboard crashes
      return null;
    }
  }

  // =====================================================
  // WORKFLOW DEPLOYMENT TRACKING (converted to REST API)
  // =====================================================

  async storeWorkflowDeployment(userId, businessConfigId, n8nWorkflowId, workflowName, webhookUrl, deploymentData) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('workflow_deployments')
        .insert({
          user_id: userId,
          business_config_id: businessConfigId,
          n8n_workflow_id: n8nWorkflowId,
          workflow_name: workflowName,
          webhook_url: webhookUrl,
          deployment_data: deploymentData,
          status: 'active'
        })
        .select('id, created_at')
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Store workflow deployment error:', error.message);
      throw error;
    }
  }

  async getWorkflowDeployments(userId) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('workflow_deployments')
        .select(
          `
          id,
          n8n_workflow_id,
          workflow_name,
          webhook_url,
          status,
          deployment_data,
          last_execution,
          execution_count,
          business_config_id,
          created_at,
          updated_at
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get workflow deployments error:', error.message);
      // Return empty array instead of throwing to prevent dashboard crashes
      return [];
    }
  }

  // =====================================================
  // ONBOARDING PROGRESS TRACKING (converted to REST API)
  // =====================================================

  async updateOnboardingProgress(
    userId,
    currentStep,
    completedSteps,
    stepData,
    googleConnected = false,
    workflowDeployed = false
  ) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('onboarding_progress')
        .upsert(
          {
            user_id: userId,
            current_step: currentStep,
            completed_steps: completedSteps,
            step_data: stepData,
            google_connected: googleConnected,
            workflow_deployed: workflowDeployed,
            onboarding_completed: workflowDeployed,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Update onboarding progress error:', error.message);
      throw error;
    }
  }

  async getOnboardingProgress(userId) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        } // No rows found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Get onboarding progress error:', error.message);
      throw error;
    }
  }

  async getOnboardingStatus(userId) {
    try {
      // Get onboarding steps
      const { data: stepsData, error: stepsError } = await this.getAdminClient()
        .from('user_onboarding_status')
        .select('step_completed, step_data, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: true });

      if (stepsError) {
        throw stepsError;
      }

      // Get user info
      const { data: userData, error: userError } = await this.getAdminClient()
        .from('users')
        .select('email_verified, onboarding_completed, first_name, company_name')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Check Google credentials
      const { data: credData, error: credError } = await this.getAdminClient()
        .from('credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('service_name', 'google');

      if (credError && credError.code !== 'PGRST116') {
        throw credError;
      }

      const completedSteps = stepsData.map(row => row.step_completed);
      const stepData = stepsData.reduce((acc, row) => {
        acc[row.step_completed] = row.step_data;
        return acc;
      }, {});

      return {
        user: {
          emailVerified: userData.email_verified,
          onboardingCompleted: userData.onboarding_completed,
          firstName: userData.first_name,
          companyName: userData.company_name
        },
        googleConnected: credData && credData.length > 0,
        completedSteps,
        stepData
      };
    } catch (error) {
      console.error('❌ Get onboarding status error:', error.message);
      throw error;
    }
  }

  // =====================================================
  // ANALYTICS TRACKING (converted to REST API)
  // =====================================================

  async trackEvent(userId, eventType, eventData, sessionId = null, ipAddress = null, userAgent = null) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('user_analytics')
        .insert({
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          session_id: sessionId,
          ip_address: ipAddress,
          user_agent: userAgent
        })
        .select('id, created_at')
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (error) {
      console.error('❌ Track event error:', error.message);
      throw error;
    }
  }

  // =====================================================
  // USER MANAGEMENT (converted to REST API)
  // =====================================================

  async getUserById(userId) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .select('id, email, first_name, last_name, company_name, email_verified, onboarding_completed, created_at, last_login')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        } // No rows found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Get user by ID error:', error.message);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .select('id, email, password_hash, email_verified, first_name, last_name')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        } // No rows found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Get user by email error:', error.message);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getRecentActivities(userId, limit = 5) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('security_audit_log')
        .select('action, ip_address, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(activity => ({
        action: activity.action,
        timestamp: activity.created_at,
        ip_address: activity.ip_address
      }));
    } catch (error) {
      console.error('❌ Get recent activities error:', error.message);
      return []; // Return empty array on error
    }
  }

  async getOAuthConnections(userId) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('oauth_tokens')
        .select('provider, created_at')
        .eq('user_id', userId)
        .not('access_token', 'is', null);

      if (error) {
        throw error;
      }

      const connections = { google: { connected: false } };
      data.forEach(oauth => {
        connections[oauth.provider] = {
          connected: true,
          connected_at: oauth.created_at
        };
      });

      return connections;
    } catch (error) {
      console.error('❌ Get OAuth connections error:', error.message);
      return { google: { connected: false } }; // Return default on error
    }
  }

  // =====================================================
  // PASSWORD RESET METHODS
  // =====================================================

  async getUserByEmailForPasswordReset(email) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .select('id, email, first_name, last_name, account_locked_until')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        return { success: false, data: null, error: 'User not found' };
      }

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  async createPasswordResetToken(userId, token, expiresAt, ipAddress = null, userAgent = null) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          token: token,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  async getPasswordResetToken(token) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('password_reset_tokens')
        .select(`
          *,
          users (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      if (error && error.code === 'PGRST116') {
        return { success: false, data: null, error: 'Token not found or expired' };
      }

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  async updateUserPassword(userId, passwordHash) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  async markPasswordResetTokenUsed(token) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('password_reset_tokens')
        .update({
          used_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  // =====================================================
  // EMAIL VERIFICATION TOKENS
  // =====================================================

  async storeVerificationToken(userId, token, email, firstName) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

      // First, delete any existing tokens for this user to avoid unique constraint violation
      await this.getAdminClient()
        .from('email_verification_tokens')
        .delete()
        .eq('user_id', userId);

      const { data, error } = await this.getAdminClient()
        .from('email_verification_tokens')
        .insert({
          user_id: userId,
          token: token,
          email: email,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Store verification token error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getVerificationToken(token) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('email_verification_tokens')
        .select('user_id, expires_at, email')
        .eq('token', token)
        .is('used_at', null) // Token hasn't been used yet
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, data: null }; // No rows found
        }
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Get verification token error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async deleteVerificationToken(token) {
    try {
      const { error } = await this.getAdminClient()
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Delete verification token error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async updateUserEmailVerification(userId, verified) {
    try {
      const { data, error } = await this.getAdminClient()
        .from('users')
        .update({
          email_verified: verified
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Update user email verification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // =====================================================
  // CONNECTION MANAGEMENT (converted to REST API)
  // =====================================================

  async testConnection() {
    try {
      // Test with a simple query to users table
      const { data: _data, error } = await this.client.from('users').select('count', { count: 'exact', head: true });

      if (error) {
        return {
          success: false,
          error: error.message,
          method: 'REST API'
        };
      }

      return {
        success: true,
        method: 'REST API',
        message: 'Supabase REST API connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        method: 'REST API'
      };
    }
  }

  // No need for close() method with REST API
  close() {
    // REST API doesn't need connection cleanup
    console.log('✅ Supabase REST API client closed (no cleanup needed)');
  }
}

module.exports = SupabaseRestClient;

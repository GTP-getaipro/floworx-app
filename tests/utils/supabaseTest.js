const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

/**
 * Supabase test configuration and utilities
 */
class SupabaseTestConfig {
  constructor() {
    // Load test environment variables
    dotenv.config({ path: '.env.test' });

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    this.testUsers = new Map();
    this.testData = new Map();
  }

  /**
   * Initialize test environment
   */
  async initialize() {
    console.log('Initializing Supabase test environment...');

    try {
      // Verify connection
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;

      // Clear test data
      await this.clearTestData();

      // Set up test users
      await this.setupTestUsers();

      console.log('Supabase test environment initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase test environment:', error);
      throw error;
    }
  }

  /**
   * Set up test users
   */
  async setupTestUsers() {
    const users = [
      {
        email: 'test.user@example.com',
        password: 'TestPass123!',
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'user'
        }
      },
      {
        email: 'test.admin@example.com',
        password: 'AdminPass123!',
        data: {
          first_name: 'Test',
          last_name: 'Admin',
          role: 'admin'
        }
      }
    ];

    for (const user of users) {
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: user.email,
        password: user.password
      });

      if (authError) throw authError;

      // Store user data in profiles table
      const { error: profileError } = await this.supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          ...user.data,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      this.testUsers.set(user.email, {
        ...authData.user,
        ...user.data
      });
    }
  }

  /**
   * Clear test data
   */
  async clearTestData() {
    const tables = [
      'profiles',
      'companies',
      'projects',
      'invites',
      'audit_logs'
    ];

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
    }
  }

  /**
   * Create test data
   */
  async createTestData(table, data) {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;

    this.testData.set(`${table}:${result[0].id}`, result[0]);
    return result[0];
  }

  /**
   * Get authentication token for test user
   */
  async getAuthToken(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data.session.access_token;
  }

  /**
   * Get test user by email
   */
  getTestUser(email) {
    return this.testUsers.get(email);
  }

  /**
   * Create RLS policies for testing
   */
  async setupRLSPolicies() {
    const policies = [
      {
        table: 'profiles',
        name: 'test_profiles_policy',
        definition: `
          CREATE POLICY test_profiles_policy ON profiles
          FOR ALL USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
        `
      },
      {
        table: 'companies',
        name: 'test_companies_policy',
        definition: `
          CREATE POLICY test_companies_policy ON companies
          FOR ALL USING (auth.uid() IN (
            SELECT user_id FROM company_members WHERE company_id = id
          ));
        `
      }
    ];

    for (const policy of policies) {
      const { error } = await this.supabase.rpc('create_policy', {
        table_name: policy.table,
        policy_name: policy.name,
        policy_definition: policy.definition
      });

      if (error) throw error;
    }
  }

  /**
   * Reset RLS policies
   */
  async resetRLSPolicies() {
    const { error } = await this.supabase.rpc('reset_policies');
    if (error) throw error;
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    await this.clearTestData();
    await this.resetRLSPolicies();
    this.testUsers.clear();
    this.testData.clear();
  }
}

// Export singleton instance
const supabaseTest = new SupabaseTestConfig();
module.exports = supabaseTest;

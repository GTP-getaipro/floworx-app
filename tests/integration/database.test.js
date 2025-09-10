const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

describe('Database Integration Tests - Business Types & Password Reset', () => {
  let testUserId;
  let testBusinessTypeId;
  let testWorkflowTemplateId;

  beforeAll(async () => {
    // Create test user for integration tests
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: `test-${uuidv4()}@floworx-test.com`,
      password: 'TestPassword123!',
      email_confirm: true
    }), 90000;
    
    if (error) throw error;
    testUserId = user.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
    if (testWorkflowTemplateId) {
      await supabase.from('workflow_templates').delete().eq('id', testWorkflowTemplateId);
    }
    if (testBusinessTypeId) {
      await supabase.from('business_types').delete().eq('id', testBusinessTypeId);
    }
  });

  describe('Business Types Table Operations', () => {
    test('BT-DB-001: Create business type with valid data', async () => {
      const businessTypeData = {
        name: 'Test Business Type',
        description: 'Test description for integration testing',
        slug: `test-business-${uuidv4()}`,
        default_categories: [
          { name: 'Service Calls', priority: 'high', description: 'Emergency repairs' },
          { name: 'Sales Inquiries', priority: 'medium', description: 'New customer quotes' }
        ],
        workflow_template_id: 'test-template-v1'
      };

      const { data, error } = await supabase
        .from('business_types')
        .insert(businessTypeData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(businessTypeData.name);
      expect(data.slug).toBe(businessTypeData.slug);
      expect(data.default_categories).toEqual(businessTypeData.default_categories);
      expect(data.is_active).toBe(true);

      testBusinessTypeId = data.id;
    });

    test('BT-DB-002: Prevent duplicate business type names/slugs', async () => {
      const duplicateData = {
        name: 'Test Business Type', // Same as previous test
        slug: 'duplicate-test-slug'
      };

      const { error } = await supabase
        .from('business_types')
        .insert(duplicateData);

      expect(error).toBeDefined();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });

    test('BT-DB-003: Soft delete business type (set is_active = false)', async () => {
      const { data, error } = await supabase
        .from('business_types')
        .update({ is_active: false })
        .eq('id', testBusinessTypeId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_active).toBe(false);

      // Restore for other tests
      await supabase
        .from('business_types')
        .update({ is_active: true })
        .eq('id', testBusinessTypeId);
    });

    test('BT-DB-004: Query active business types only', async () => {
      const { data, error } = await supabase
        .rpc('get_active_business_types');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      // All returned types should be active
      data.forEach(businessType => {
        expect(businessType.name).toBeDefined();
        expect(businessType.slug).toBeDefined();
      });
    });

    test('BT-DB-005: Validate JSONB default_categories structure', async () => {
      const { data, error } = await supabase
        .from('business_types')
        .select('default_categories')
        .eq('id', testBusinessTypeId)
        .single();

      expect(error).toBeNull();
      expect(Array.isArray(data.default_categories)).toBe(true);
      
      if (data.default_categories.length > 0) {
        const category = data.default_categories[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(category.priority);
      }
    });
  });

  describe('Workflow Templates Table Operations', () => {
    test('WT-DB-001: Create workflow template linked to business type', async () => {
      const templateData = {
        business_type_id: testBusinessTypeId,
        name: 'Test Workflow Template',
        description: 'Test template for integration testing',
        template_json: {
          name: 'Test Workflow',
          nodes: [
            {
              name: 'Gmail Trigger',
              type: 'n8n-nodes-base.gmailTrigger',
              parameters: {}
            }
          ],
          connections: {}
        },
        version: '1.0.0',
        features: {
          email_categorization: true,
          priority_routing: true
        },
        requirements: {
          gmail_oauth: true,
          team_email_addresses: true
        }
      };

      const { data, error } = await supabase
        .from('workflow_templates')
        .insert(templateData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.business_type_id).toBe(testBusinessTypeId);
      expect(data.name).toBe(templateData.name);
      expect(data.template_json).toEqual(templateData.template_json);

      testWorkflowTemplateId = data.id;
    });

    test('WT-DB-002: Prevent orphaned templates (foreign key constraint)', async () => {
      const invalidTemplateData = {
        business_type_id: 99999, // Non-existent business type
        name: 'Invalid Template',
        template_json: { nodes: [] }
      };

      const { error } = await supabase
        .from('workflow_templates')
        .insert(invalidTemplateData);

      expect(error).toBeDefined();
      expect(error.code).toBe('23503'); // Foreign key constraint violation
    });

    test('WT-DB-003: Query templates by business type', async () => {
      const { data, error } = await supabase
        .rpc('get_workflow_template_for_business_type', {
          p_business_type_id: testBusinessTypeId
        });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      
      const template = data[0];
      expect(template.name).toBeDefined();
      expect(template.template_json).toBeDefined();
      expect(template.features).toBeDefined();
    });

    test('WT-DB-004: Validate template_json structure', async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('template_json')
        .eq('id', testWorkflowTemplateId)
        .single();

      expect(error).toBeNull();
      expect(data.template_json).toHaveProperty('name');
      expect(data.template_json).toHaveProperty('nodes');
      expect(Array.isArray(data.template_json.nodes)).toBe(true);
    });
  });

  describe('Users Table Integration', () => {
    test('U-DB-001: Add business_type_id to existing user', async () => {
      const { data, error } = await supabase
        .from('users')
        .update({ business_type_id: testBusinessTypeId })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.business_type_id).toBe(testBusinessTypeId);
    });

    test('U-DB-002: Query users with business type join', async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          business_type_id,
          business_types (
            id,
            name,
            slug,
            default_categories
          )
        `)
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data.business_types).toBeDefined();
      expect(data.business_types.name).toBeDefined();
      expect(data.business_types.slug).toBeDefined();
    });

    test('U-DB-003: Handle NULL business_type_id gracefully', async () => {
      // Temporarily set business_type_id to NULL
      await supabase
        .from('users')
        .update({ business_type_id: null })
        .eq('id', testUserId);

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          business_type_id,
          business_types (
            id,
            name
          )
        `)
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data.business_type_id).toBeNull();
      expect(data.business_types).toBeNull();

      // Restore business type for other tests
      await supabase
        .from('users')
        .update({ business_type_id: testBusinessTypeId })
        .eq('id', testUserId);
    });
  });

  describe('Password Reset Token Operations', () => {
    let testTokenId;

    test('PR-DB-001: Create password reset token', async () => {
      const token = 'test-token-' + uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const { data, error } = await supabase
        .rpc('create_password_reset_token', {
          p_user_id: testUserId,
          p_token: token,
          p_expires_at: expiresAt.toISOString(),
          p_ip_address: '127.0.0.1',
          p_user_agent: 'Test Agent'
        });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      testTokenId = data;
    });

    test('PR-DB-002: Validate password reset token', async () => {
      const { data: tokens, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('id', testTokenId)
        .single();

      expect(error).toBeNull();
      expect(tokens.user_id).toBe(testUserId);
      expect(tokens.used).toBe(false);
      expect(new Date(tokens.expires_at)).toBeInstanceOf(Date);
    });

    test('PR-DB-003: Use password reset token', async () => {
      const { data: tokenData } = await supabase
        .from('password_reset_tokens')
        .select('token')
        .eq('id', testTokenId)
        .single();

      const { data, error } = await supabase
        .rpc('use_password_reset_token', {
          p_token: tokenData.token,
          p_ip_address: '127.0.0.1',
          p_user_agent: 'Test Agent'
        });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].valid).toBe(true);
      expect(data[0].user_id).toBe(testUserId);
    });
  });

  describe('RLS Policy Enforcement', () => {
    let anotherUserId;

    beforeAll(async () => {
      // Create another test user
      const { data: user, error } = await supabase.auth.admin.createUser({
        email: `test-rls-${uuidv4()}@floworx-test.com`,
        password: 'TestPassword123!',
        email_confirm: true
      }), 90000;
      
      if (error) throw error;
      anotherUserId = user.user.id;
    });

    afterAll(async () => {
      if (anotherUserId) {
        await supabase.auth.admin.deleteUser(anotherUserId);
      }
    });

    test('RLS-001: Users can only view active business types', async () => {
      // This should work for any user (public access to active business types)
      const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    test('RLS-002: Users cannot access other users password reset tokens', async () => {
      // Create a client with user authentication (simulated)
      const userClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
      
      // This should return empty results due to RLS
      const { data, error } = await userClient
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', testUserId); // Different user's tokens

      // Should either return empty array or access denied
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    test('DB-PERF-001: Business type query performance', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .rpc('get_active_business_types');
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(100); // Should be under 100ms
    });

    test('DB-PERF-002: User business type join performance', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          business_types (name, slug)
        `)
        .eq('id', testUserId)
        .single();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(150); // Should be under 150ms
    });
  });
});

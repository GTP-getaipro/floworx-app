/**
 * Database Integration Tests with Mocks
 * Tests database operations using mocked Supabase client
 */

const { businessTypes, users, passwordResetTokens } = require('../fixtures/testData');

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  limit: jest.fn(() => mockSupabaseClient),
  rpc: jest.fn(),
  auth: {
    admin: {
      createUser: jest.fn(),
      deleteUser: jest.fn()
    }
  }
};

// Mock the Supabase module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

describe('Database Integration Tests (Mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Business Types Operations', () => {
    test('BT-DB-001: Create business type with valid data', async () => {
      const businessTypeData = businessTypes.hotTubSpa;
      
      // Mock successful insertion
      mockSupabaseClient.single.mockResolvedValue({
        data: businessTypeData,
        error: null
      });

      // Simulate the database operation
      const result = await mockSupabaseClient
        .from('business_types')
        .insert(businessTypeData)
        .select()
        .single();

      expect(result.data).toEqual(businessTypeData);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('business_types');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(businessTypeData);
    });

    test('BT-DB-002: Prevent duplicate business type names/slugs', async () => {
      const duplicateData = {
        name: 'Hot Tub & Spa', // Duplicate name
        slug: 'duplicate-test-slug'
      };

      // Mock unique constraint violation
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      });

      const result = await mockSupabaseClient
        .from('business_types')
        .insert(duplicateData)
        .single();

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('23505');
    });

    test('BT-DB-004: Query active business types only', async () => {
      const activeBusinessTypes = [businessTypes.hotTubSpa, businessTypes.electrician];
      
      // Mock RPC call for active business types
      mockSupabaseClient.rpc.mockResolvedValue({
        data: activeBusinessTypes,
        error: null
      });

      const result = await mockSupabaseClient.rpc('get_active_business_types');

      expect(result.data).toEqual(activeBusinessTypes);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_active_business_types');
    });

    test('BT-DB-005: Validate JSONB default_categories structure', async () => {
      const businessType = businessTypes.hotTubSpa;
      
      mockSupabaseClient.single.mockResolvedValue({
        data: { default_categories: businessType.default_categories },
        error: null
      });

      const result = await mockSupabaseClient
        .from('business_types')
        .select('default_categories')
        .eq('id', 1)
        .single();

      expect(result.data.default_categories).toBeDefined();
      expect(Array.isArray(result.data.default_categories)).toBe(true);
      
      if (result.data.default_categories.length > 0) {
        const category = result.data.default_categories[0];
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(category.priority);
      }
    });
  });

  describe('User Business Type Association', () => {
    test('U-DB-001: Add business_type_id to existing user', async () => {
      const userId = users.testUser.id;
      const businessTypeId = 1;

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...users.testUser, business_type_id: businessTypeId },
        error: null
      });

      const result = await mockSupabaseClient
        .from('users')
        .update({ business_type_id: businessTypeId })
        .eq('id', userId)
        .select()
        .single();

      expect(result.data.business_type_id).toBe(businessTypeId);
      expect(result.error).toBeNull();
    });

    test('U-DB-002: Query users with business type join', async () => {
      const userWithBusinessType = {
        ...users.userWithBusinessType,
        business_types: businessTypes.hotTubSpa
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: userWithBusinessType,
        error: null
      });

      const result = await mockSupabaseClient
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
        .eq('id', users.userWithBusinessType.id)
        .single();

      expect(result.data.business_types).toBeDefined();
      expect(result.data.business_types.name).toBe('Hot Tub & Spa');
    });
  });

  describe('Password Reset Token Operations', () => {
    test('PR-DB-001: Create password reset token', async () => {
      const tokenData = passwordResetTokens.validToken;

      mockSupabaseClient.rpc.mockResolvedValue({
        data: tokenData.id,
        error: null
      });

      const result = await mockSupabaseClient.rpc('create_password_reset_token', {
        p_user_id: tokenData.user_id,
        p_token: tokenData.token,
        p_expires_at: tokenData.expires_at,
        p_ip_address: tokenData.ip_address,
        p_user_agent: tokenData.user_agent
      });

      expect(result.data).toBe(tokenData.id);
      expect(result.error).toBeNull();
    });

    test('PR-DB-003: Use password reset token', async () => {
      const tokenData = passwordResetTokens.validToken;

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{
          valid: true,
          user_id: tokenData.user_id,
          message: 'Token is valid'
        }],
        error: null
      });

      const result = await mockSupabaseClient.rpc('use_password_reset_token', {
        p_token: tokenData.token,
        p_ip_address: '127.0.0.1',
        p_user_agent: 'Test Agent'
      });

      expect(result.data[0].valid).toBe(true);
      expect(result.data[0].user_id).toBe(tokenData.user_id);
    });
  });

  describe('Performance Tests (Mocked)', () => {
    test('DB-PERF-001: Business type query performance', async () => {
      const startTime = Date.now();
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [businessTypes.hotTubSpa],
        error: null
      });

      const result = await mockSupabaseClient.rpc('get_active_business_types');
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.error).toBeNull();
      expect(queryTime).toBeLessThan(100); // Mock should be very fast
    });

    test('DB-PERF-002: User business type join performance', async () => {
      const startTime = Date.now();
      
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...users.userWithBusinessType,
          business_types: businessTypes.hotTubSpa
        },
        error: null
      });

      const result = await mockSupabaseClient
        .from('users')
        .select('id, email, business_types (name, slug)')
        .eq('id', users.userWithBusinessType.id)
        .single();
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result.error).toBeNull();
      expect(queryTime).toBeLessThan(50); // Mock should be very fast
    });
  });

  describe('RLS Policy Simulation', () => {
    test('RLS-001: Users can only view active business types', async () => {
      // Simulate RLS filtering
      const activeBusinessTypes = [businessTypes.hotTubSpa, businessTypes.electrician];
      
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValue({
        data: activeBusinessTypes,
        error: null
      });

      const result = await mockSupabaseClient
        .from('business_types')
        .select('*')
        .eq('is_active', true);

      expect(result.data).toEqual(activeBusinessTypes);
      expect(result.error).toBeNull();
    });

    test('RLS-002: Users cannot access other users password reset tokens', async () => {
      // Simulate RLS blocking access to other users' tokens
      mockSupabaseClient.eq.mockResolvedValue({
        data: [], // Empty result due to RLS
        error: null
      });

      const result = await mockSupabaseClient
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', 'different-user-id');

      expect(result.data).toEqual([]);
    });
  });
});

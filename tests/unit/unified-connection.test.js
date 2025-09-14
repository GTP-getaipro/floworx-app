/**
 * Unit Tests for Unified Database Connection
 * Tests database connection management, query execution, and error handling
 */

const { databaseManager, query, healthCheck } = require('../../backend/database/unified-connection');

// Mock the Supabase REST client
jest.mock('../../backend/database/supabase-rest-client', () => {
  return jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    healthCheck: jest.fn(),
    getUserById: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    getOnboardingStatus: jest.fn(),
    getUserByEmailForPasswordReset: jest.fn(),
    createPasswordResetToken: jest.fn(),
    getPasswordResetToken: jest.fn(),
    updateUserPassword: jest.fn(),
    markPasswordResetTokenUsed: jest.fn()
  }));
});

describe('Unified Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Manager Initialization', () => {
    test('should initialize database manager', () => {
      expect(databaseManager).toBeDefined();
      expect(databaseManager.isInitialized).toBeDefined();
      expect(databaseManager.useRestApi).toBeDefined();
    });

    test('should have connection configuration', () => {
      expect(databaseManager.connectionConfig).toBeDefined();
      expect(databaseManager.connectionConfig).toHaveProperty('host');
      expect(databaseManager.connectionConfig).toHaveProperty('port');
      expect(databaseManager.connectionConfig).toHaveProperty('database');
    });
  });

  describe('Query Execution', () => {
    test('should execute simple queries', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }] };
      databaseManager.restClient.query.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [1]);

      expect(databaseManager.restClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
      expect(result).toEqual(mockResult);
    });

    test('should handle query errors', async () => {
      const mockError = new Error('Database connection failed');
      databaseManager.restClient.query.mockRejectedValue(mockError);

      await expect(query('SELECT * FROM users')).rejects.toThrow('Database connection failed');
    });

    test('should handle parameterized queries', async () => {
      const mockResult = { rows: [{ id: 1, email: 'test@example.com' }] };
      databaseManager.restClient.query.mockResolvedValue(mockResult);

      const result = await query(
        'SELECT * FROM users WHERE email = $1 AND active = $2',
        ['test@example.com', true]
      );

      expect(databaseManager.restClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND active = $2',
        ['test@example.com', true]
      );
      expect(result).toEqual(mockResult);
    });

    test('should handle empty result sets', async () => {
      const mockResult = { rows: [] };
      databaseManager.restClient.query.mockResolvedValue(mockResult);

      const result = await query('SELECT * FROM users WHERE id = $1', [999]);

      expect(result.rows).toHaveLength(0);
    });
  });

  describe('Health Check', () => {
    test('should perform health check successfully', async () => {
      const mockHealthResult = {
        connected: true,
        method: 'REST API',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      databaseManager.restClient.healthCheck.mockResolvedValue(mockHealthResult);

      const result = await healthCheck();

      expect(databaseManager.restClient.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(mockHealthResult);
    });

    test('should handle health check failures', async () => {
      const mockHealthResult = {
        connected: false,
        method: 'REST API',
        error: 'Connection timeout',
        timestamp: new Date().toISOString()
      };
      databaseManager.restClient.healthCheck.mockResolvedValue(mockHealthResult);

      const result = await healthCheck();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('User Management Methods', () => {
    test('should get user by ID', async () => {
      const mockUser = { id: '123', email: 'test@example.com', first_name: 'Test' };
      databaseManager.restClient.getUserById.mockResolvedValue(mockUser);

      const result = await databaseManager.getUserById('123');

      expect(databaseManager.restClient.getUserById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });

    test('should get user by email', async () => {
      const mockUser = { id: '123', email: 'test@example.com', first_name: 'Test' };
      databaseManager.restClient.getUserByEmail.mockResolvedValue(mockUser);

      const result = await databaseManager.getUserByEmail('test@example.com');

      expect(databaseManager.restClient.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockUser);
    });

    test('should create user', async () => {
      const userData = {
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        password_hash: 'hashed_password'
      };
      const mockResult = { id: '456', ...userData };
      databaseManager.restClient.createUser.mockResolvedValue(mockResult);

      const result = await databaseManager.createUser(userData);

      expect(databaseManager.restClient.createUser).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Transaction Management', () => {
    test('should execute transactions', async () => {
      const mockResults = [
        { rows: [{ id: 1 }] },
        { rows: [{ id: 2 }] }
      ];
      
      databaseManager.restClient.query
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const transactionCallback = jest.fn().mockImplementation(async (client) => {
        const result1 = await client.query('INSERT INTO users (name) VALUES ($1)', ['User 1']);
        const result2 = await client.query('INSERT INTO users (name) VALUES ($1)', ['User 2']);
        return [result1, result2];
      });

      const result = await databaseManager.transaction(transactionCallback);

      expect(transactionCallback).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    test('should handle transaction rollback on error', async () => {
      const mockError = new Error('Transaction failed');
      databaseManager.restClient.query.mockRejectedValue(mockError);

      const transactionCallback = jest.fn().mockImplementation(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['User 1']);
        throw mockError;
      });

      await expect(databaseManager.transaction(transactionCallback)).rejects.toThrow('Transaction failed');
    });
  });

  describe('Connection Management', () => {
    test('should initialize connection', async () => {
      const mockInitResult = { success: true, method: 'REST API' };
      databaseManager.restClient.healthCheck.mockResolvedValue({
        connected: true,
        method: 'REST API'
      });

      const result = await databaseManager.initialize();

      expect(databaseManager.isInitialized).toBe(true);
      expect(result).toBeDefined();
    });

    test('should handle initialization errors', async () => {
      const mockError = new Error('Initialization failed');
      databaseManager.restClient.healthCheck.mockRejectedValue(mockError);

      await expect(databaseManager.initialize()).rejects.toThrow('Initialization failed');
    });

    test('should close connection', async () => {
      databaseManager.restClient.close = jest.fn().mockResolvedValue();

      await databaseManager.close();

      expect(databaseManager.restClient.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      databaseManager.restClient.query.mockRejectedValue(networkError);

      await expect(query('SELECT 1')).rejects.toThrow('Network timeout');
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      databaseManager.restClient.query.mockRejectedValue(authError);

      await expect(query('SELECT 1')).rejects.toThrow('Authentication failed');
    });

    test('should handle malformed queries', async () => {
      const queryError = new Error('Syntax error in query');
      databaseManager.restClient.query.mockRejectedValue(queryError);

      await expect(query('INVALID SQL QUERY')).rejects.toThrow('Syntax error in query');
    });
  });

  describe('Performance', () => {
    test('should handle concurrent queries', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      databaseManager.restClient.query.mockResolvedValue(mockResult);

      const promises = Array.from({ length: 10 }, (_, i) => 
        query('SELECT * FROM users WHERE id = $1', [i])
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(databaseManager.restClient.query).toHaveBeenCalledTimes(10);
    });

    test('should handle large result sets', async () => {
      const largeResultSet = {
        rows: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `User ${i}` }))
      };
      databaseManager.restClient.query.mockResolvedValue(largeResultSet);

      const result = await query('SELECT * FROM users');

      expect(result.rows).toHaveLength(1000);
      expect(result.rows[0]).toHaveProperty('id');
      expect(result.rows[0]).toHaveProperty('name');
    });
  });

  describe('Configuration', () => {
    test('should use correct connection configuration', () => {
      const config = databaseManager.getConnectionConfig();
      
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('user');
      expect(config).toHaveProperty('password');
    });

    test('should handle missing environment variables', () => {
      const originalEnv = process.env;
      process.env = {};

      expect(() => {
        databaseManager.getConnectionConfig();
      }).not.toThrow();

      process.env = originalEnv;
    });
  });
});

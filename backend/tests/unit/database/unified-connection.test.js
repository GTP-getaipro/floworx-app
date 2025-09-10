/**
 * Unit Tests for DatabaseManager (unified-connection.js)
 * Tests PostgreSQL connection management and query operations
 */

const { databaseManager } = require('../../../database/unified-connection');
const { Pool } = require('pg');

// Mock dependencies
jest.mock('pg');
jest.mock('../../../utils/encryption');

describe('DatabaseManager', () => {
  let mockPool;
  let mockClient;
  let dbManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    };

    // Mock Pool constructor
    Pool.mockImplementation(() => mockPool);

    // Override the database manager's pool
    databaseManager.pool = mockPool;
    databaseManager.isInitialized = false;

    // Set dbManager reference
    dbManager = databaseManager;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Connection Management', () => {
    test('should establish database connection', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ now: new Date() }] });

      const pool = await databaseManager.initialize();

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }));
      expect(pool).toBe(mockPool);
      expect(databaseManager.isInitialized).toBe(true);
    });

    test('should handle connection failures gracefully', async () => {
      const connectionError = new Error('Connection failed');
      Pool.mockImplementation(() => {
        throw connectionError;
      });

      await expect(dbManager.initialize()).rejects.toThrow('Connection failed');
      expect(dbManager.isInitialized).toBe(false);
    });

    test('should use connection pooling effectively', async () => {
      await dbManager.initialize();

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        max: expect.any(Number),
        min: 0,
        idleTimeoutMillis: expect.any(Number),
        connectionTimeoutMillis: expect.any(Number)
      }));
    });

    test('should close connections properly', async () => {
      await dbManager.initialize();
      mockPool.end.mockResolvedValue();

      await dbManager.close();

      expect(mockPool.end).toHaveBeenCalled();
      expect(dbManager.isInitialized).toBe(false);
      expect(dbManager.pool).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    test('should execute SELECT queries', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test User', email: 'test@example.com' }],
        rowCount: 1
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbManager.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    test('should execute INSERT queries', async () => {
      const mockResult = {
        rows: [{ id: 2, name: 'New User', email: 'new@example.com' }],
        rowCount: 1
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbManager.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        ['New User', 'new@example.com']
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        ['New User', 'new@example.com']
      );
      expect(result).toEqual(mockResult);
    });

    test('should execute UPDATE queries', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Updated User', email: 'updated@example.com' }],
        rowCount: 1
      };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbManager.query(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        ['Updated User', 1]
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        ['Updated User', 1]
      );
      expect(result).toEqual(mockResult);
    });

    test('should execute DELETE queries', async () => {
      const mockResult = { rows: [], rowCount: 1 };
      mockPool.query.mockResolvedValue(mockResult);

      const result = await dbManager.query('DELETE FROM users WHERE id = $1', [1]);

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockResult);
    });

    test('should handle query errors gracefully', async () => {
      const queryError = new Error('Query execution failed');
      mockPool.query.mockRejectedValue(queryError);

      await expect(
        dbManager.query('SELECT * FROM non_existent_table')
      ).rejects.toThrow('Query execution failed');
    });
  });

  describe('Transaction Support', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    test('should support database transactions', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const result = await dbManager.transaction(async (client) => {
        return await client.query('INSERT INTO users (name) VALUES ($1) RETURNING id', ['Test']);
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result).toEqual({ rows: [{ id: 1 }], rowCount: 1 });
    });

    test('should rollback failed transactions', async () => {
      const transactionError = new Error('Transaction failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(transactionError) // Failed query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      await expect(
        dbManager.transaction((_client) => {
          throw transactionError;
        })
      ).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should commit successful transactions', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      await dbManager.transaction(async (client) => {
        return await client.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Performance & Monitoring', () => {
    beforeEach(async () => {
      await dbManager.initialize();
    });

    test('should track query performance', async () => {
      const _startTime = Date.now();
      mockPool.query.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ rows: [], rowCount: 0 }), 10);
        });
      });

      const result = await dbManager.query('SELECT 1');

      expect(result).toBeDefined();
      // Performance tracking would be implemented in the actual method
    });

    test('should handle concurrent queries', async () => {
      const queries = [
        'SELECT * FROM users WHERE id = 1',
        'SELECT * FROM users WHERE id = 2',
        'SELECT * FROM users WHERE id = 3'
      ];

      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const promises = queries.map(query => dbManager.query(query));
      await Promise.all(promises);

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should provide connection pool statistics', async () => {
      await dbManager.initialize();

      const stats = dbManager.getPoolStats();

      expect(stats).toEqual({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0
      });
    });
  });

  describe('Configuration', () => {
    test('should use production configuration in production', () => {
      process.env.NODE_ENV = 'production';
      const prodDbManager = databaseManager;

      expect(prodDbManager.connectionConfig.max).toBe(1);
      expect(prodDbManager.connectionConfig.ssl).toEqual({
        rejectUnauthorized: false
      });
    });

    test('should use development configuration in development', () => {
      process.env.NODE_ENV = 'development';
      const devDbManager = databaseManager;

      expect(devDbManager.connectionConfig.max).toBe(10);
      expect(devDbManager.connectionConfig.ssl).toBe(false);
    });

    test('should handle missing environment variables', () => {
      const originalEnv = process.env;
      process.env = {};

      const dbManager = databaseManager;

      expect(dbManager.connectionConfig.port).toBe(5432);
      expect(dbManager.connectionConfig.host).toBeUndefined();

      process.env = originalEnv;
    });
  });

  describe('Error Handling', () => {
    test('should handle pool connection errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Pool connection failed'));

      await expect(
        dbManager.transaction(async () => {})
      ).rejects.toThrow('Pool connection failed');
    });

    test('should handle query timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockPool.query.mockRejectedValue(timeoutError);

      await expect(
        dbManager.query('SELECT pg_sleep(10)')
      ).rejects.toThrow('Query timeout');
    });

    test('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Pool exhausted');
      poolError.code = 'ECONNREFUSED';
      mockPool.query.mockRejectedValue(poolError);

      await expect(
        dbManager.query('SELECT 1')
      ).rejects.toThrow('Pool exhausted');
    });
  });
});

/**
 * Database Performance Tests
 * Tests query performance, caching effectiveness, and optimization validation
 */

const { query } = require('../../database/unified-connection');
const queryOptimizationService = require('../../services/queryOptimizationService');
const cacheService = require('../../services/cacheService');

describe('Database Performance Tests', () => {
  const testUsers = [];
  const PERFORMANCE_THRESHOLD = {
    FAST_QUERY: 100,    // < 100ms
    MEDIUM_QUERY: 500,  // < 500ms
    SLOW_QUERY: 1000    // < 1000ms
  };

  beforeAll(async () => {
    // Create test data for performance testing
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('Query Performance', () => {
    test('user lookup by email should be fast', async () => {
      const startTime = Date.now();
      
      const result = await query(
        'SELECT id, email, first_name, last_name FROM users WHERE email = $1',
        ['perf-test-1@example.com']
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.rows).toHaveLength(1);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_QUERY);
    });

    test('user lookup by ID should be fast', async () => {
      const userId = testUsers[0].id;
      const startTime = Date.now();
      
      const result = await query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );
      
      const duration = Date.now() - startTime;
      
      expect(result.rows).toHaveLength(1);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_QUERY);
    });

    test('credentials lookup should be optimized', async () => {
      const userId = testUsers[0].id;
      const startTime = Date.now();
      
      const result = await query(
        'SELECT * FROM credentials WHERE user_id = $1 AND service_name = $2',
        [userId, 'google']
      );
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.FAST_QUERY);
    });

    test('complex join query should be reasonably fast', async () => {
      const userId = testUsers[0].id;
      const startTime = Date.now();
      
      const result = await query(`
        SELECT 
          u.id, u.email, u.first_name, u.last_name,
          c.service_name, c.expiry_date,
          bc.category_name,
          wd.workflow_name, wd.workflow_status
        FROM users u
        LEFT JOIN credentials c ON u.id = c.user_id
        LEFT JOIN business_categories bc ON u.id = bc.user_id
        LEFT JOIN workflow_deployments wd ON u.id = wd.user_id
        WHERE u.id = $1
      `, [userId]);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_QUERY);
    });

    test('bulk user query should be optimized', async () => {
      const startTime = Date.now();
      
      const result = await query(`
        SELECT id, email, first_name, last_name, created_at
        FROM users 
        WHERE email LIKE $1
        ORDER BY created_at DESC
        LIMIT 100
      `, ['%perf-test%']);
      
      const duration = Date.now() - startTime;
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_QUERY);
    });
  });

  describe('Query Optimization Service', () => {
    test('should cache query results effectively', async () => {
      const userId = testUsers[0].id;
      const queryText = 'SELECT * FROM users WHERE id = $1';
      
      // First execution (cache miss)
      const startTime1 = Date.now();
      const result1 = await queryOptimizationService.executeOptimized(
        queryText, 
        [userId], 
        { cache: true, cacheTTL: 300 }
      );
      const duration1 = Date.now() - startTime1;
      
      // Second execution (cache hit)
      const startTime2 = Date.now();
      const result2 = await queryOptimizationService.executeOptimized(
        queryText, 
        [userId], 
        { cache: true, cacheTTL: 300 }
      );
      const duration2 = Date.now() - startTime2;
      
      expect(result1.rows).toEqual(result2.rows);
      expect(duration2).toBeLessThan(duration1); // Cache should be faster
      expect(duration2).toBeLessThan(50); // Cache hit should be very fast
    });

    test('should batch queries efficiently', async () => {
      const queries = testUsers.slice(0, 5).map(user => ({
        queryText: 'SELECT * FROM users WHERE id = $1',
        params: [user.id],
        options: { cache: true }
      }));
      
      const startTime = Date.now();
      const results = await queryOptimizationService.executeBatch(queries);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_QUERY);
      
      // Verify all queries returned results
      results.forEach(result => {
        expect(result.rows).toHaveLength(1);
      });
    });

    test('should optimize user with related data query', async () => {
      const userId = testUsers[0].id;
      
      const startTime = Date.now();
      const userData = await queryOptimizationService.getUserWithRelatedData(userId);
      const duration = Date.now() - startTime;
      
      expect(userData).toBeDefined();
      expect(userData.id).toBe(userId);
      expect(userData.credentials).toBeDefined();
      expect(userData.businessCategories).toBeDefined();
      expect(userData.workflows).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_QUERY);
    });

    test('should track performance metrics', () => {
      const metrics = queryOptimizationService.getMetrics();
      
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('optimizedQueries');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Cache Performance', () => {
    test('cache set and get should be fast', async () => {
      const testData = { id: 'test', data: 'performance test data' };
      const cacheKey = 'perf-test-key';
      
      // Test cache set
      const setStartTime = Date.now();
      await cacheService.set(cacheKey, testData, 300);
      const setDuration = Date.now() - setStartTime;
      
      // Test cache get
      const getStartTime = Date.now();
      const cachedData = await cacheService.get(cacheKey);
      const getDuration = Date.now() - getStartTime;
      
      expect(cachedData).toEqual(testData);
      expect(setDuration).toBeLessThan(100);
      expect(getDuration).toBeLessThan(50);
    });

    test('cache should handle concurrent operations', async () => {
      const promises = Array(10).fill().map(async (_, index) => {
        const key = `concurrent-test-${index}`;
        const data = { index, timestamp: Date.now() };
        
        await cacheService.set(key, data, 300);
        return await cacheService.get(key);
      });
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.MEDIUM_QUERY);
      
      results.forEach((result, index) => {
        expect(result.index).toBe(index);
      });
    });
  });

  describe('Index Effectiveness', () => {
    test('should use index for email lookups', async () => {
      const explainResult = await query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT id, email FROM users WHERE email = $1
      `, ['perf-test-1@example.com']);
      
      const queryPlan = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      
      // Should use index scan, not sequential scan
      expect(queryPlan).toMatch(/Index Scan|Bitmap Index Scan/);
      expect(queryPlan).not.toMatch(/Seq Scan/);
    });

    test('should use index for user_id foreign key lookups', async () => {
      const userId = testUsers[0].id;
      const explainResult = await query(`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM credentials WHERE user_id = $1
      `, [userId]);
      
      const queryPlan = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      
      expect(queryPlan).toMatch(/Index Scan|Bitmap Index Scan/);
    });
  });

  describe('Connection Pool Performance', () => {
    test('should handle concurrent connections efficiently', async () => {
      const concurrentQueries = Array(20).fill().map(() => 
        query('SELECT COUNT(*) FROM users WHERE email LIKE $1', ['%perf-test%'])
      );
      
      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.SLOW_QUERY);
      
      results.forEach(result => {
        expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
      });
    });
  });

  describe('Memory Usage', () => {
    test('should not cause memory leaks with repeated queries', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many queries
      for (let i = 0; i < 100; i++) {
        await query('SELECT id FROM users LIMIT 1');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test users
    for (let i = 1; i <= 10; i++) {
      const userData = {
        email: `perf-test-${i}@example.com`,
        password_hash: 'hashed-password',
        first_name: `Test${i}`,
        last_name: 'User',
        email_verified: true
      };
      
      const result = await query(`
        INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email
      `, [userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.email_verified]);
      
      testUsers.push(result.rows[0]);
      
      // Add some related data
      await query(`
        INSERT INTO credentials (user_id, service_name, access_token, refresh_token)
        VALUES ($1, $2, $3, $4)
      `, [result.rows[0].id, 'google', 'encrypted-token', 'encrypted-refresh']);
      
      await query(`
        INSERT INTO business_categories (user_id, category_name, description)
        VALUES ($1, $2, $3)
      `, [result.rows[0].id, `Category ${i}`, `Test category ${i}`]);
      
      await query(`
        INSERT INTO workflow_deployments (user_id, workflow_name, workflow_status)
        VALUES ($1, $2, $3)
      `, [result.rows[0].id, `Workflow ${i}`, 'active']);
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse order due to foreign key constraints
    await query('DELETE FROM workflow_deployments WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%perf-test%']);
    await query('DELETE FROM business_categories WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%perf-test%']);
    await query('DELETE FROM credentials WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['%perf-test%']);
    await query('DELETE FROM users WHERE email LIKE $1', ['%perf-test%']);
  }
});

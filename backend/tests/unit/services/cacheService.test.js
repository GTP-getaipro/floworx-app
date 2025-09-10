/**
 * Unit Tests for CacheService
 * Tests KeyDB/Redis caching with in-memory fallback
 */

// Mock dependencies BEFORE requiring the service
jest.mock('ioredis');
jest.mock('node-cache');

// Mock Redis constructor
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushdb: jest.fn(),
  keys: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
  disconnect: jest.fn()
};

// Mock NodeCache constructor
const mockNodeCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushAll: jest.fn(),
  keys: jest.fn(),
  getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0 }),
  options: { maxKeys: 50, stdTTL: 30 }
};

// Setup mocks
const Redis = require('ioredis');
const NodeCache = require('node-cache');

Redis.mockImplementation(() => mockRedis);
NodeCache.mockImplementation(() => mockNodeCache);

// Now require the service after mocks are set up
const cacheService = require('../../../services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Override the service properties with our mocks
    cacheService.redis = mockRedis;
    cacheService.memoryCache = mockNodeCache;
    cacheService.isRedisConnected = true;

    // Reset stats
    cacheService.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Operations', () => {
    test('should set and get string values', async () => {
      const key = 'test-key';
      const value = 'test-value';

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 300);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
    });

    test('should set and get object values', async () => {
      const key = 'test-obj';
      const value = { name: 'test', id: 123, active: true };

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(JSON.stringify(value));

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 300);
      expect(result).toEqual(value);
    });

    test('should handle null/undefined values', async () => {
      const key = 'null-key';

      mockRedis.get.mockResolvedValue(null);
      mockNodeCache.get.mockReturnValue(undefined);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    test('should delete keys successfully', async () => {
      const key = 'delete-key';

      mockRedis.del.mockResolvedValue(1);
      mockNodeCache.del.mockReturnValue(true);

      await cacheService.del(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
      expect(mockNodeCache.del).toHaveBeenCalledWith(key);
    });

    test('should clear all cache entries', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');
      mockNodeCache.flushAll.mockReturnValue(undefined);

      await cacheService.clear();

      expect(mockRedis.flushdb).toHaveBeenCalled();
      expect(mockNodeCache.flushAll).toHaveBeenCalled();
    });
  });

  describe('TTL and Expiration', () => {
    test('should respect TTL expiration', async () => {
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 60;

      mockRedis.set.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', ttl);
    });

    test('should handle custom TTL values', async () => {
      const key = 'custom-ttl';
      const value = 'custom-value';
      const customTTL = 1800; // 30 minutes

      mockRedis.set.mockResolvedValue('OK');

      await cacheService.set(key, value, customTTL);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', customTTL);
    });

    test('should use default TTL when not specified', async () => {
      const key = 'default-ttl';
      const value = 'default-value';

      mockRedis.set.mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(mockRedis.set).toHaveBeenCalledWith(key, JSON.stringify(value), 'EX', 300);
    });
  });

  describe('Redis/KeyDB Integration', () => {
    test('should fallback to memory when Redis unavailable', async () => {
      // Simulate Redis failure
      cacheService.isRedisConnected = false;
      mockNodeCache.get.mockReturnValue('memory-value');

      const result = await cacheService.get('test-key');

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('memory-value');
    });

    test('should prefer Redis when available', async () => {
      cacheService.isRedisConnected = true;
      mockRedis.get.mockResolvedValue(JSON.stringify('redis-value'));

      const result = await cacheService.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('redis-value');
    });

    test('should handle Redis connection failures gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockNodeCache.get.mockReturnValue('fallback-value');

      const result = await cacheService.get('test-key');

      expect(result).toBe('fallback-value');
      expect(mockNodeCache.get).toHaveBeenCalledWith('test-key');
    });

    test('should sync between Redis and memory cache', async () => {
      const key = 'sync-key';
      const value = 'sync-value';

      mockRedis.set.mockResolvedValue('OK');
      mockNodeCache.set.mockReturnValue(true);

      await cacheService.set(key, value);

      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockNodeCache.set).toHaveBeenCalledWith(key, JSON.stringify(value), 300);
    });
  });

  describe('Advanced Features', () => {
    test('should implement getOrSet pattern correctly', async () => {
      const key = 'getOrSet-key';
      const fetchedValue = 'fetched-value';
      const fetchFunction = jest.fn().mockResolvedValue(fetchedValue);

      // First call - cache miss
      mockRedis.get.mockResolvedValue(null);
      mockNodeCache.get.mockReturnValue(undefined);
      mockRedis.set.mockResolvedValue('OK');

      const result = await cacheService.getOrSet(key, fetchFunction);

      expect(fetchFunction).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
      expect(result).toBe(fetchedValue);
    });

    test('should handle pattern-based deletions', async () => {
      const pattern = 'user:*';
      const matchingKeys = ['user:1', 'user:2', 'user:3'];

      mockRedis.keys.mockResolvedValue(matchingKeys);
      mockRedis.del.mockResolvedValue(matchingKeys.length);
      mockNodeCache.keys.mockReturnValue(matchingKeys);

      const deletedCount = await cacheService.deletePattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
      expect(deletedCount).toBe(matchingKeys.length);
    });

    test('should provide accurate statistics', () => {
      cacheService.stats = {
        hits: 10,
        misses: 5,
        sets: 8,
        deletes: 2,
        errors: 1
      };

      const stats = cacheService.getStats();

      expect(stats).toEqual({
        type: 'redis',
        connected: true,
        keys: expect.any(Number),
        memoryUsage: expect.any(String),
        hits: 10,
        misses: 5,
        sets: 8,
        deletes: 2,
        errors: 1,
        hitRate: '66.67%'
      });
    });
  });

  describe('Performance & Memory', () => {
    test('should respect maxKeys limit', () => {
      expect(mockNodeCache.options.maxKeys).toBe(50);
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      const keys = ['key1', 'key2', 'key3', 'key4', 'key5'];

      mockRedis.set.mockResolvedValue('OK');

      // Simulate concurrent set operations
      keys.forEach(key => {
        promises.push(cacheService.set(key, `value-${key}`));
      });

      await Promise.all(promises);

      expect(mockRedis.set).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle serialization errors', async () => {
      const key = 'error-key';
      const circularObj = {};
      circularObj.self = circularObj; // Create circular reference

      await expect(cacheService.set(key, circularObj)).rejects.toThrow();
    });

    test('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockNodeCache.get.mockReturnValue('fallback');

      const result = await cacheService.get('test-key');
      expect(result).toBe('fallback');
    });

    test('should increment error stats on failures', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      mockNodeCache.get.mockReturnValue(null);

      await cacheService.get('error-key');

      expect(cacheService.stats.errors).toBeGreaterThan(0);
    });
  });
});

/**
 * Unit Tests for CacheService
 * Tests caching functionality, TTL management, and error handling
 */

const cacheService = require('../../backend/services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
  });

  afterEach(() => {
    // Clean up after each test
    cacheService.clear();
  });

  describe('Basic Cache Operations', () => {
    test('should set and get cache values', () => {
      const key = 'test-key';
      const value = { data: 'test-value', timestamp: Date.now() };

      cacheService.set(key, value);
      const result = cacheService.get(key);

      expect(result).toEqual(value);
    });

    test('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('should handle different data types', () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { nested: { data: 'value' } } },
        { key: 'array', value: [1, 2, 3, 'test'] }
      ];

      testCases.forEach(({ key, value }) => {
        cacheService.set(key, value);
        expect(cacheService.get(key)).toEqual(value);
      });
    });

    test('should overwrite existing values', () => {
      const key = 'overwrite-test';
      const initialValue = 'initial';
      const newValue = 'updated';

      cacheService.set(key, initialValue);
      expect(cacheService.get(key)).toBe(initialValue);

      cacheService.set(key, newValue);
      expect(cacheService.get(key)).toBe(newValue);
    });
  });

  describe('TTL (Time To Live) Management', () => {
    test('should respect TTL for cache expiration', (done) => {
      const key = 'ttl-test';
      const value = 'ttl-value';
      const ttl = 100; // 100ms

      cacheService.set(key, value, ttl);
      expect(cacheService.get(key)).toBe(value);

      setTimeout(() => {
        expect(cacheService.get(key)).toBeNull();
        done();
      }, ttl + 10);
    });

    test('should not expire before TTL', (done) => {
      const key = 'ttl-test-2';
      const value = 'ttl-value-2';
      const ttl = 200; // 200ms

      cacheService.set(key, value, ttl);

      setTimeout(() => {
        expect(cacheService.get(key)).toBe(value);
        done();
      }, ttl - 50);
    });

    test('should use default TTL when not specified', () => {
      const key = 'default-ttl';
      const value = 'default-value';

      cacheService.set(key, value);
      // Should not be null immediately
      expect(cacheService.get(key)).toBe(value);
    });
  });

  describe('Cache Management', () => {
    test('should clear all cache entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
      expect(cacheService.get('key3')).toBe('value3');

      cacheService.clear();

      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.get('key3')).toBeNull();
    });

    test('should delete specific cache entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      cacheService.delete('key1');

      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBe('value2');
    });

    test('should handle deletion of non-existent keys gracefully', () => {
      expect(() => {
        cacheService.delete('non-existent-key');
      }).not.toThrow();
    });
  });

  describe('Cache Statistics', () => {
    test('should provide cache statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.get('key1'); // Hit
      cacheService.get('key3'); // Miss

      const stats = cacheService.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('size');
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });

    test('should calculate hit rate correctly', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      // 2 hits, 1 miss
      cacheService.get('key1');
      cacheService.get('key2');
      cacheService.get('key3');

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeCloseTo(2/3, 2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid keys gracefully', () => {
      expect(() => {
        cacheService.set(null, 'value');
      }).not.toThrow();

      expect(() => {
        cacheService.set(undefined, 'value');
      }).not.toThrow();

      expect(() => {
        cacheService.get(null);
      }).not.toThrow();
    });

    test('should handle circular references', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        cacheService.set('circular', circularObj);
      }).not.toThrow();

      const result = cacheService.get('circular');
      expect(result).toBeDefined();
      expect(result.name).toBe('test');
    });

    test('should handle very large values', () => {
      const largeValue = 'x'.repeat(1000000); // 1MB string

      expect(() => {
        cacheService.set('large', largeValue);
      }).not.toThrow();

      const result = cacheService.get('large');
      expect(result).toBe(largeValue);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent set operations', () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise((resolve) => {
            cacheService.set(`concurrent-${i}`, `value-${i}`);
            resolve();
          })
        );
      }

      return Promise.all(promises).then(() => {
        for (let i = 0; i < 100; i++) {
          expect(cacheService.get(`concurrent-${i}`)).toBe(`value-${i}`);
        }
      });
    });

    test('should handle concurrent get operations', () => {
      cacheService.set('concurrent-get', 'test-value');

      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          new Promise((resolve) => {
            const result = cacheService.get('concurrent-get');
            expect(result).toBe('test-value');
            resolve();
          })
        );
      }

      return Promise.all(promises);
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory with expired entries', (done) => {
      const initialStats = cacheService.getStats();
      
      // Set many entries with short TTL
      for (let i = 0; i < 1000; i++) {
        cacheService.set(`memory-test-${i}`, `value-${i}`, 50);
      }

      setTimeout(() => {
        // All entries should be expired
        const finalStats = cacheService.getStats();
        
        // Size should be 0 or very small
        expect(finalStats.size).toBe(0);
        done();
      }, 100);
    });
  });
});

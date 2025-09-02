/**
 * Redis Cache Service for FloWorx SaaS
 * High-performance caching layer with automatic invalidation and compression
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const { performance } = require('perf_hooks');

/**
 * Multi-tier caching service with Redis and in-memory fallback
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new NodeCache({ 
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance, but be careful with object mutations
    });
    this.isRedisConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with fallback to memory cache
   */
  async initializeRedis() {
    // Skip Redis initialization if not configured or in development
    if (!process.env.REDIS_HOST || process.env.NODE_ENV === 'development') {
      console.log('⚠️ Redis disabled - using memory cache only');
      this.isRedisConnected = false;
      return;
    }

    try {
      const redisConfig = {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Prevent excessive reconnection attempts
        enableOfflineQueue: false,
        retryDelayOnClusterDown: 300,
        enableReadyCheck: false
      };

      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isRedisConnected = true;
      });

      this.redis.on('error', (error) => {
        console.warn('⚠️ Redis connection error, falling back to memory cache:', error.message);
        this.isRedisConnected = false;
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        console.warn('⚠️ Redis connection closed, using memory cache');
        this.isRedisConnected = false;
      });

      // Test connection
      await this.redis.ping();
      
    } catch (error) {
      console.warn('⚠️ Redis initialization failed, using memory cache only:', error.message);
      this.isRedisConnected = false;
    }
  }

  /**
   * Get value from cache with automatic tier fallback
   */
  async get(key, options = {}) {
    const startTime = performance.now();
    
    try {
      let value = null;
      let source = 'miss';

      // Try Redis first if available
      if (this.isRedisConnected && this.redis) {
        try {
          const redisValue = await this.redis.get(key);
          if (redisValue !== null) {
            value = this.deserialize(redisValue);
            source = 'redis';
          }
        } catch (error) {
          console.warn(`Redis get error for key ${key}:`, error.message);
          this.stats.errors++;
        }
      }

      // Fallback to memory cache
      if (value === null) {
        const memValue = this.memoryCache.get(key);
        if (memValue !== undefined) {
          value = memValue;
          source = 'memory';
        }
      }

      // Update stats
      if (value !== null) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }

      // Log performance for debugging
      const duration = performance.now() - startTime;
      if (duration > 10) { // Log slow cache operations
        console.warn(`🐌 Slow cache get (${duration.toFixed(2)}ms): ${key} from ${source}`);
      }

      return value;
      
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with automatic tier distribution
   */
  async set(key, value, ttl = 300) {
    const startTime = performance.now();
    
    try {
      const serializedValue = this.serialize(value);
      
      // Set in Redis if available
      if (this.isRedisConnected && this.redis) {
        try {
          if (ttl > 0) {
            await this.redis.setex(key, ttl, serializedValue);
          } else {
            await this.redis.set(key, serializedValue);
          }
        } catch (error) {
          console.warn(`Redis set error for key ${key}:`, error.message);
          this.stats.errors++;
        }
      }

      // Always set in memory cache as backup
      this.memoryCache.set(key, value, ttl);
      
      this.stats.sets++;

      // Log performance
      const duration = performance.now() - startTime;
      if (duration > 10) {
        console.warn(`🐌 Slow cache set (${duration.toFixed(2)}ms): ${key}`);
      }

      return true;
      
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete key from all cache tiers
   */
  async delete(key) {
    try {
      // Delete from Redis
      if (this.isRedisConnected && this.redis) {
        try {
          await this.redis.del(key);
        } catch (error) {
          console.warn(`Redis delete error for key ${key}:`, error.message);
        }
      }

      // Delete from memory cache
      this.memoryCache.del(key);
      
      this.stats.deletes++;
      return true;
      
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern) {
    try {
      let deletedCount = 0;

      // Delete from Redis using pattern
      if (this.isRedisConnected && this.redis) {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
          }
        } catch (error) {
          console.warn(`Redis pattern delete error for ${pattern}:`, error.message);
        }
      }

      // Delete from memory cache (manual pattern matching)
      const memoryKeys = this.memoryCache.keys();
      const matchingKeys = memoryKeys.filter(key => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(key);
      });
      
      matchingKeys.forEach(key => {
        this.memoryCache.del(key);
        deletedCount++;
      });

      this.stats.deletes += deletedCount;
      return deletedCount;
      
    } catch (error) {
      console.error(`Cache pattern delete error for ${pattern}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get or set pattern - cache with automatic population
   */
  async getOrSet(key, fetchFunction, ttl = 300) {
    const value = await this.get(key);
    
    if (value !== null) {
      return value;
    }

    // Value not in cache, fetch it
    try {
      const freshValue = await fetchFunction();
      if (freshValue !== null && freshValue !== undefined) {
        await this.set(key, freshValue, ttl);
      }
      return freshValue;
    } catch (error) {
      console.error(`Cache getOrSet fetch error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Serialize value for storage
   */
  serialize(value) {
    try {
      return JSON.stringify({
        data: value,
        timestamp: Date.now(),
        type: typeof value
      });
    } catch (error) {
      console.error('Cache serialization error:', error);
      return JSON.stringify({ data: null, timestamp: Date.now(), type: 'null' });
    }
  }

  /**
   * Deserialize value from storage
   */
  deserialize(serializedValue) {
    try {
      const parsed = JSON.parse(serializedValue);
      return parsed.data;
    } catch (error) {
      console.error('Cache deserialization error:', error);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    
    return {
      redis: {
        connected: this.isRedisConnected,
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        ksize: memoryStats.ksize,
        vsize: memoryStats.vsize
      },
      combined: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        errors: this.stats.errors
      }
    };
  }

  /**
   * Clear all caches
   */
  async clear() {
    try {
      // Clear Redis
      if (this.isRedisConnected && this.redis) {
        await this.redis.flushdb();
      }

      // Clear memory cache
      this.memoryCache.flushAll();

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0
      };

      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      redis: { status: 'disconnected', latency: null },
      memory: { status: 'ok', keys: this.memoryCache.keys().length },
      overall: 'degraded'
    };

    // Test Redis
    if (this.isRedisConnected && this.redis) {
      try {
        const start = performance.now();
        await this.redis.ping();
        health.redis.status = 'connected';
        health.redis.latency = performance.now() - start;
      } catch (error) {
        health.redis.status = 'error';
      }
    }

    // Overall health
    if (health.redis.status === 'connected') {
      health.overall = 'healthy';
    } else if (health.memory.status === 'ok') {
      health.overall = 'degraded'; // Memory cache working but Redis down
    } else {
      health.overall = 'unhealthy';
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.memoryCache.close();
      console.log('✅ Cache service shutdown complete');
    } catch (error) {
      console.error('Cache shutdown error:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

/**
 * KeyDB Cache Service for FloWorx SaaS - FIXED VERSION
 * High-performance caching layer with KeyDB (Redis-compatible) and in-memory fallback
 * KeyDB is faster and more efficient than Redis while being 100% compatible
 */

const { performance } = require('perf_hooks');

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const redisManager = require('./redis-connection-manager');

/**
 * Multi-tier caching service with KeyDB (Redis-compatible) and in-memory fallback
 * KeyDB provides better performance and lower memory usage than Redis
 */
class CacheService {
  constructor() {
    this.redis = null;
    this.memoryCache = new NodeCache({
      stdTTL: process.env.CACHE_TTL || 30, // Reduced to 30 seconds for better memory management
      checkperiod: 10, // Check for expired keys every 10 seconds
      useClones: false, // Better performance
      maxKeys: process.env.CACHE_MAX_KEYS || 50, // Further reduced for memory efficiency
      deleteOnExpire: true, // Automatically delete expired keys
      enableLegacyCallbacks: false // Better performance
    });
    this.isRedisConnected = false;
    this.isInitializing = false; // Track initialization state
    this.initializationPromise = null; // Store initialization promise
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    console.log('🗄️ Initializing KeyDB cache service...');
    console.log(`   Max Keys: ${this.memoryCache.options.maxKeys}`);
    console.log(`   Default TTL: ${this.memoryCache.options.stdTTL}s`);

    this.initializeKeyDB();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize KeyDB connection with enhanced retry logic
   * KeyDB is 100% Redis-compatible but faster and more efficient
   */
  async initializeKeyDB() {
    // Prevent multiple initialization attempts
    if (this.isInitializing) {

      return this.initializationPromise;
    }

    if (this.isRedisConnected && this.redis) {

      return;
    }

    // Check if we're in development/test mode
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

    // Skip KeyDB initialization if disabled or not configured
    if (process.env.DISABLE_REDIS === 'true') {
      if (!isDevelopment) {

      }
      this.isRedisConnected = false;
      return;
    }

    // In test mode, skip Redis entirely unless explicitly enabled
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_REDIS_IN_TESTS !== 'true') {
      this.isRedisConnected = false;
      return;
    }

    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
      if (!isDevelopment) {
        console.warn('⚠️ Redis not configured - using in-memory cache');
        console.warn('   Set REDIS_HOST or REDIS_URL for production caching');
        console.warn('   Performance may be degraded without Redis');
      }
      this.isRedisConnected = false;
      return;
    }

    // Set initialization state and create promise
    this.isInitializing = true;
    this.initializationPromise = this._performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  async _performInitialization() {
    try {
      console.log('🔄 CacheService: Using redis-connection-manager for KeyDB connection');

      // Use the working redis-connection-manager instead of custom connection logic
      try {
        await redisManager.connect();
        this.redis = redisManager.getClient();

        if (this.redis && typeof this.redis.ping === 'function') {
          // Test the connection
          const pingResult = await this.redis.ping();
          if (pingResult === 'PONG') {
            console.log('✅ CacheService: KeyDB connection successful via redis-connection-manager');
            this.isRedisConnected = true;
            return;
          }
        }

        console.log('⚠️ CacheService: Redis client not available, using fallback');
        this.redis = null;
        this.isRedisConnected = false;

      } catch (error) {
        console.warn('⚠️ CacheService: KeyDB connection failed, using memory cache only:', error.message);
        this.redis = null;
        this.isRedisConnected = false;
      }
    } catch (error) {
      console.error('CacheService initialization error:', error);
      this.redis = null;
      this.isRedisConnected = false;
    }
  }

  /**
   * Reset Redis connection state and attempt reconnection
   */
  async resetConnection() {
    console.log('🔄 Resetting KeyDB connection...');

    // Reset state
    this.isRedisConnected = false;
    this.isInitializing = false;
    this.initializationPromise = null;

    // Close existing connection
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {

      }
      this.redis = null;
    }

    // Attempt reconnection
    try {
      await this.initializeKeyDB();
    } catch (error) {
      console.warn('⚠️ Failed to reconnect after reset:', error.message);
    }
  }

  /**
   * Get value from cache with automatic tier fallback
   */
  async get(key, _options = {}) {
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

      matchingKeys.forEach(key => this.memoryCache.del(key));
      deletedCount += matchingKeys.length;

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
   * Health check with improved Redis monitoring
   */
  async healthCheck() {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const health = {
      redis: {
        status: 'disconnected',
        latency: null,
        configured: !!(process.env.REDIS_URL || process.env.REDIS_HOST),
        mode: isDevelopment ? 'development' : 'production'
      },
      memory: {
        status: 'ok',
        keys: this.memoryCache.keys().length,
        maxKeys: this.memoryCache.options.maxKeys
      },
      overall: 'degraded'
    };

    // Test Redis connection
    if (this.isRedisConnected && this.redis) {
      try {
        const start = performance.now();
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 2000))
        ]);
        health.redis.status = 'connected';
        health.redis.latency = Math.round(performance.now() - start);
      } catch (error) {
        if (!isDevelopment) {
          console.warn('⚠️ Redis health check failed:', error.message);
        }
        health.redis.status = 'error';
        this.isRedisConnected = false;
      }
    } else if (health.redis.configured && !this.isInitializing) {
      health.redis.status = 'disconnected';
    } else if (!health.redis.configured) {
      health.redis.status = 'not_configured';
    }

    // Overall health assessment
    if (health.redis.status === 'connected') {
      health.overall = 'healthy';
    } else if (health.redis.status === 'not_configured' && isDevelopment) {
      health.overall = 'healthy'; // OK in development without Redis
    } else if (health.memory.status === 'ok') {
      health.overall = 'degraded'; // Memory cache working but Redis down
    } else {
      health.overall = 'unhealthy';
    }

    return health;
  }

  /**
   * Attempt to reconnect to Redis (for manual recovery)
   */
  async reconnect() {
    if (this.isInitializing) {

      return false;
    }

    if (this.isRedisConnected) {

      return true;
    }

    console.log('🔄 Attempting Redis reconnection...');
    try {
      await this.initializeKeyDB();
      return this.isRedisConnected;
    } catch (error) {
      console.warn('⚠️ Redis reconnection failed:', error.message);
      return false;
    }
  }

  /**
   * Start memory monitoring and cleanup for in-memory cache
   */
  startMemoryMonitoring() {
    // Monitor memory usage every 15 seconds (more frequent)
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // More aggressive memory management
      if (memUsageMB > 30 || memUsageMB / memLimitMB > 0.6) {
        const keyCount = this.memoryCache.keys().length;

        if (keyCount > 50) {
          // Clear 70% of cache entries to free memory
          const keys = this.memoryCache.keys();
          const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.7));

          keysToDelete.forEach(key => this.memoryCache.del(key));

          console.warn(
            `🧹 Aggressive memory cleanup: Removed ${keysToDelete.length} cache entries. Memory: ${memUsageMB}MB/${memLimitMB}MB, Remaining keys: ${this.memoryCache.keys().length}`
          );
        }
      } else if (memUsageMB > 20 && !this.isRedisConnected) {
        // Less aggressive cleanup when Redis is not connected
        const keyCount = this.memoryCache.keys().length;

        if (keyCount > 25) {
          const keys = this.memoryCache.keys();
          const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.5));

          keysToDelete.forEach(key => this.memoryCache.del(key));

          console.warn(
            `🧹 Memory cleanup: Removed ${keysToDelete.length} cache entries. Memory: ${memUsageMB}MB, Remaining keys: ${this.memoryCache.keys().length}`
          );
        }
      }
    }, 15000); // Every 15 seconds
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

    } catch (error) {
      console.error('Cache shutdown error:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

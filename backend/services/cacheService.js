/**
 * KeyDB Cache Service for FloWorx SaaS - FIXED VERSION
 * High-performance caching layer with KeyDB (Redis-compatible) and in-memory fallback
 * KeyDB is faster and more efficient than Redis while being 100% compatible
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const { performance } = require('perf_hooks');

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
    // Skip KeyDB initialization if not configured
    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
      console.log('⚠️ KeyDB disabled - using memory cache only');
      console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
      console.log(`   REDIS_URL: ${process.env.REDIS_URL ? 'SET' : 'not set'}`);
      console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      this.isRedisConnected = false;
      return;
    }

    try {
      // If REDIS_URL is provided, use it directly (Coolify style)
      if (process.env.REDIS_URL) {
        console.log('🔗 Using REDIS_URL for KeyDB connection');

        // Use REDIS_URL directly
        const redisUrl = process.env.REDIS_URL;

        const keydbConfig = {
          connectTimeout: 5000,
          commandTimeout: 3000,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 2,
          lazyConnect: true,
          keepAlive: 30000,
          enableOfflineQueue: true,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            if (times > 3) {
              return null;
            }
            return Math.min(times * 200, 1000);
          }
        };

        this.redis = new Redis(redisUrl, keydbConfig);

        // Set up event handlers
        this.redis.on('connect', () => {
          console.log('✅ KeyDB connected successfully via REDIS_URL');
          this.isRedisConnected = true;
        });

        this.redis.on('error', error => {
          console.warn('⚠️ KeyDB error:', error.message);
          this.isRedisConnected = false;
          this.stats.errors++;
        });

        this.redis.on('close', () => {
          console.warn('⚠️ KeyDB connection closed');
          this.isRedisConnected = false;
        });

        // Test connection
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);

        console.log('✅ KeyDB connection test successful');
        this.isRedisConnected = true;
        return;
      }

      // Fallback to host-based connection
      const possibleHosts = [
        process.env.REDIS_HOST,
        'sckck444cs4c88g0ws8kw0ss', // Correct Coolify hostname
        'keydb-database-sckck444cs4c88g0ws8kw0ss', // Full service name
        'keydb-service',
        'floworx-keydb',
        'redis-db', // Docker compose fallback
        '127.0.0.1'
      ].filter(Boolean);

      console.log('🔍 KeyDB connection debug info:');
      console.log(`   REDIS_HOST env var: ${process.env.REDIS_HOST || 'not set'}`);
      console.log(`   REDIS_URL env var: ${process.env.REDIS_URL ? 'SET (hidden)' : 'not set'}`);
      console.log(`   Trying hosts: ${possibleHosts.join(', ')}`);

      let connected = false;
      let lastError = null;

      for (const host of possibleHosts) {
        try {
          console.log(`🔗 Trying KeyDB connection to: ${host}:${process.env.REDIS_PORT || 6379}`);

          const keydbConfig = {
            host: host,
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: process.env.REDIS_DB || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 2,
            lazyConnect: true,
            keepAlive: 30000,
            connectTimeout: 5000,
            commandTimeout: 3000,
            enableOfflineQueue: true,
            retryDelayOnClusterDown: 300,
            enableReadyCheck: false,
            retryStrategy: (times) => {
              if (times > 3) return null;
              return Math.min(times * 200, 1000);
            }
          };

          this.redis = new Redis(keydbConfig);

          // Set up event handlers
          this.redis.on('connect', () => {
            console.log(`✅ KeyDB connected successfully to ${host}`);
            this.isRedisConnected = true;
          });

          this.redis.on('error', error => {
            console.warn(`⚠️ KeyDB error on ${host}:`, error.message);
            this.isRedisConnected = false;
            this.stats.errors++;
          });

          this.redis.on('close', () => {
            console.warn(`⚠️ KeyDB connection closed on ${host}`);
            this.isRedisConnected = false;
          });

          // Test connection with timeout
          await Promise.race([
            this.redis.ping(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 3000)
            )
          ]);

          console.log(`✅ KeyDB ping successful on ${host}`);
          connected = true;
          break;

        } catch (error) {
          lastError = error;
          console.warn(`❌ KeyDB connection failed on ${host}:`, error.message);
          if (this.redis) {
            this.redis.disconnect();
            this.redis = null;
          }
          continue;
        }
      }

      if (!connected) {
        throw lastError || new Error('All KeyDB connection attempts failed');
      }

    } catch (error) {
      console.warn('⚠️ KeyDB initialization failed completely, using memory cache only:', error.message);
      this.isRedisConnected = false;
      this.redis = null;
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

      // Log performance for debugging
      const duration = performance.now() - startTime;
      if (duration > 10) {
        // Log slow cache operations
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
      } catch (_error) {
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
   * Start memory monitoring and cleanup for in-memory cache
   */
  startMemoryMonitoring() {
    // Monitor memory usage every 15 seconds (more frequent)
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // More aggressive memory management
      if (memUsageMB > 30 || (memUsageMB / memLimitMB) > 0.6) {
        const keyCount = this.memoryCache.keys().length;

        if (keyCount > 50) {
          // Clear 70% of cache entries to free memory
          const keys = this.memoryCache.keys();
          const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.7));

          keysToDelete.forEach(key => this.memoryCache.del(key));

          console.warn(`🧹 Aggressive memory cleanup: Removed ${keysToDelete.length} cache entries. Memory: ${memUsageMB}MB/${memLimitMB}MB, Remaining keys: ${this.memoryCache.keys().length}`);
        }
      } else if (memUsageMB > 20 && !this.isRedisConnected) {
        // Less aggressive cleanup when Redis is not connected
        const keyCount = this.memoryCache.keys().length;

        if (keyCount > 25) {
          const keys = this.memoryCache.keys();
          const keysToDelete = keys.slice(0, Math.floor(keys.length * 0.5));

          keysToDelete.forEach(key => this.memoryCache.del(key));

          console.warn(`🧹 Memory cleanup: Removed ${keysToDelete.length} cache entries. Memory: ${memUsageMB}MB, Remaining keys: ${this.memoryCache.keys().length}`);
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
      console.log('✅ Cache service shutdown complete');
    } catch (error) {
      console.error('Cache shutdown error:', error);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

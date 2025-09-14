/**
 * Redis Connection Manager with Retry Logic
 * Handles network delays and connection failures gracefully
 */

const Redis = require('ioredis');
const { logger } = require('../utils/logger');

class RedisConnectionManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 10;
    this.retryDelay = 2000; // Start with 2 seconds
    this.maxRetryDelay = 30000; // Max 30 seconds
  }

  /**
   * Initialize Redis connection with retry logic
   */
  connect() {
    const redisConfig = this.getRedisConfig();

    // If Redis is disabled or no config, return resolved promise
    if (!redisConfig) {
      console.log('🔴 Redis connection skipped (disabled or no config)');
      return Promise.resolve(null);
    }

    console.log('🔴 Attempting Redis connection...');
    console.log(`   Host: ${redisConfig.host}`);
    console.log(`   Port: ${redisConfig.port}`);
    console.log(`   Password: ${redisConfig.password ? '[SET]' : '[NOT SET]'}`);

    return new Promise((resolve, reject) => {
      this.attemptConnection(redisConfig, resolve, reject);
    });
  }

  /**
   * Get Redis configuration from environment
   */
  getRedisConfig() {
    // Check if Redis is disabled
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('🔴 Redis is disabled via DISABLE_REDIS environment variable');
      return null;
    }

    // Try to use REDIS_URL first (Coolify format)
    if (process.env.REDIS_URL) {
      try {
        const url = new URL(process.env.REDIS_URL);
        const config = {
          host: url.hostname,
          port: parseInt(url.port, 10) || 6379,
          password: url.password || undefined,
          db: parseInt(url.pathname.slice(1), 10) || 0,
          retryDelayOnFailover: 100,
          retryDelayOnClusterDown: 300,
          retryDelayOnFailoverAttempts: 3,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,
          // Retry strategy
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
            return delay;
          }
        };

        console.log(`🔧 Using REDIS_URL configuration: ${url.hostname}:${config.port}`);
        return config;
      } catch (error) {
        console.warn('⚠️ Failed to parse REDIS_URL, falling back to individual variables');
      }
    }

    // Fallback to individual environment variables
    const possibleHosts = [
      process.env.REDIS_HOST,
      process.env.KEYDB_HOST,
      'redis-database',
      'keydb-database',
      'sckck444cs4c88g0ws8kw0ss', // Coolify KeyDB hostname from docs
      '127.0.0.1',
      'localhost'
    ].filter(Boolean);

    const config = {
      host: possibleHosts[0] || 'localhost',
      port: parseInt(process.env.REDIS_PORT || process.env.KEYDB_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || process.env.KEYDB_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      retryDelayOnFailoverAttempts: 3,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Retry strategy
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`🔄 Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      }
    };

    console.log(`🔧 Using individual Redis config: ${config.host}:${config.port}`);
    return config;
  }

  /**
   * Attempt connection with exponential backoff
   */
  attemptConnection(config, resolve, reject) {
    this.connectionAttempts++;

    console.log(`🔄 Redis connection attempt ${this.connectionAttempts}/${this.maxRetries}`);

    // Try different hosts if previous attempts failed
    if (this.connectionAttempts > 1) {
      const possibleHosts = [
        process.env.REDIS_HOST,
        process.env.KEYDB_HOST,
        'sckck444cs4c88g0ws8kw0ss', // Coolify KeyDB hostname
        'redis-database',
        'keydb-database',
        'redis-database-bgkgcogwgcksc0sccw48c8s0',
        '127.0.0.1',
        'localhost'
      ].filter(Boolean);

      const hostIndex = (this.connectionAttempts - 1) % possibleHosts.length;
      config.host = possibleHosts[hostIndex];
      console.log(`   Trying host: ${config.host}`);
    }

    this.client = new Redis(config);

    // Connection success
    this.client.on('connect', () => {
      
      this.isConnected = true;
      resolve(this.client);
    });

    // Connection ready
    this.client.on('ready', () => {
      console.log('🚀 Redis ready for commands');
    });

    // Connection error
    this.client.on('error', (error) => {

      if (this.connectionAttempts < this.maxRetries) {
        // Calculate exponential backoff delay
        const delay = Math.min(
          this.retryDelay * Math.pow(2, this.connectionAttempts - 1),
          this.maxRetryDelay
        );
        
        console.log(`⏳ Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          this.client.disconnect();
          this.attemptConnection(config, resolve, reject);
        }, delay);
      } else {
        
        reject(new Error(`Redis connection failed after ${this.maxRetries} attempts: ${error.message}`));
      }
    });

    // Connection close
    this.client.on('close', () => {
      console.log('🔴 Redis connection closed');
      this.isConnected = false;
    });

    // Attempt to connect
    this.client.connect().catch((error) => {
      logger.error(`Redis connection failed: ${error.message}`);
    });
  }

  /**
   * Get the Redis client (with fallback)
   */
  getClient() {
    if (this.isConnected && this.client) {
      return this.client;
    }
    
    // Return a mock client if Redis is not available
    
    return this.createFallbackClient();
  }

  /**
   * Create a fallback client that doesn't crash the app
   */
  createFallbackClient() {
    return {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      del: () => Promise.resolve(1),
      exists: () => Promise.resolve(0),
      expire: () => Promise.resolve(1),
      ttl: () => Promise.resolve(-1),
      keys: () => Promise.resolve([]),
      flushall: () => Promise.resolve('OK'),
      ping: () => Promise.resolve('PONG'),
      quit: () => Promise.resolve('OK'),
      disconnect: () => {},
      on: () => {},
      off: () => {}
    };
  }

  /**
   * Test Redis connection
   */
  async testConnection() {
    try {
      const client = this.getClient();
      const result = await client.ping();
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (this.client) {
      console.log('🔴 Disconnecting Redis...');
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const redisManager = new RedisConnectionManager();

module.exports = redisManager;

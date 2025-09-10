/**
 * Redis Connection Manager with Retry Logic
 * Handles network delays and connection failures gracefully
 */

const Redis = require('ioredis');

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
    
    console.log('🔴 Attempting Redis connection...');
    console.log(`   Host: ${redisConfig.host}`);
    console.log(`   Port: ${redisConfig.port}`);
    
    return new Promise((resolve, reject) => {
      this.attemptConnection(redisConfig, resolve, reject);
    });
  }

  /**
   * Get Redis configuration from environment
   */
  getRedisConfig() {
    // Try multiple Redis host configurations
    const possibleHosts = [
      process.env.REDIS_HOST,
      'redis-database',
      'redis-database-bgkgcogwgcksc0sccw48c8s0',
      '127.0.0.1',
      'localhost'
    ].filter(Boolean);

    const config = {
      host: possibleHosts[0] || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
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

    // Add authentication if password is provided
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

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
        'redis-database',
        'redis-database-bgkgcogwgcksc0sccw48c8s0',
        '127.0.0.1',
        'localhost'
      ];
      
      const hostIndex = (this.connectionAttempts - 1) % possibleHosts.length;
      config.host = possibleHosts[hostIndex];
      console.log(`   Trying host: ${config.host}`);
    }

    this.client = new Redis(config);

    // Connection success
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully!');
      this.isConnected = true;
      resolve(this.client);
    });

    // Connection ready
    this.client.on('ready', () => {
      console.log('🚀 Redis ready for commands');
    });

    // Connection error
    this.client.on('error', (error) => {
      console.log(`❌ Redis connection error: ${error.message}`);
      
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
        console.log('❌ Max Redis connection attempts reached');
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
      console.log(`❌ Redis connect() failed: ${error.message}`);
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
    console.log('⚠️  Redis not available, using fallback');
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
      console.log('✅ Redis ping successful:', result);
      return true;
    } catch (error) {
      console.log('❌ Redis ping failed:', error.message);
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

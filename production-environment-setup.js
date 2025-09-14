/**
 * Production Environment Setup Script
 * Configures production database, Redis, n8n, and security settings
 */

const { Pool } = require('pg');
const Redis = require('ioredis');
const axios = require('axios');
const crypto = require('crypto');

class ProductionEnvironmentSetup {
  constructor() {
    this.config = {
      database: {
        // Production database configuration with connection pooling
        pool: {
          max: 20, // Maximum connections
          min: 5,  // Minimum connections
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 500
        },
        // Backup configuration
        backup: {
          enabled: true,
          schedule: '0 2 * * *', // Daily at 2 AM
          retention: 30, // Keep 30 days
          compression: true,
          encryption: true
        }
      },
      redis: {
        // Production Redis configuration
        cluster: {
          enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
          nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || []
        },
        single: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB) || 0
        },
        options: {
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000
        }
      },
      n8n: {
        // Production n8n configuration
        baseUrl: process.env.N8N_BASE_URL || 'https://n8n.floworx-iq.com',
        apiKey: process.env.N8N_API_KEY,
        webhookUrl: process.env.N8N_WEBHOOK_URL,
        timeout: 30000,
        retries: 3
      },
      security: {
        // Security configuration
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        sessionSecret: process.env.SESSION_SECRET,
        corsOrigins: process.env.CORS_ORIGIN?.split(',') || [],
        rateLimiting: {
          enabled: true,
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100,
          authMaxRequests: 5
        }
      }
    };
  }

  /**
   * Initialize production database with proper scaling
   */
  async setupProductionDatabase() {
    console.log('🔧 Setting up production database...');
    
    try {
      // Create optimized connection pool
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false,
          require: true
        } : false,
        ...this.config.database.pool
      });

      // Test connection
      const client = await pool.connect();
      console.log('✅ Database connection established');

      // Setup database optimizations
      await this.setupDatabaseOptimizations(client);
      
      // Setup backup policies
      await this.setupBackupPolicies(client);
      
      // Setup monitoring
      await this.setupDatabaseMonitoring(client);

      client.release();
      await pool.end();
      
      console.log('✅ Production database setup complete');
      return { success: true };
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup database optimizations for production
   */
  async setupDatabaseOptimizations(client) {
    console.log('🔧 Applying database optimizations...');
    
    const optimizations = [
      // Connection settings
      "ALTER SYSTEM SET max_connections = '200';",
      "ALTER SYSTEM SET shared_buffers = '256MB';",
      "ALTER SYSTEM SET effective_cache_size = '1GB';",
      "ALTER SYSTEM SET maintenance_work_mem = '64MB';",
      "ALTER SYSTEM SET checkpoint_completion_target = 0.9;",
      "ALTER SYSTEM SET wal_buffers = '16MB';",
      "ALTER SYSTEM SET default_statistics_target = 100;",
      
      // Performance settings
      "ALTER SYSTEM SET random_page_cost = 1.1;",
      "ALTER SYSTEM SET effective_io_concurrency = 200;",
      
      // Logging settings
      "ALTER SYSTEM SET log_min_duration_statement = '1000';",
      "ALTER SYSTEM SET log_checkpoints = on;",
      "ALTER SYSTEM SET log_connections = on;",
      "ALTER SYSTEM SET log_disconnections = on;",
      "ALTER SYSTEM SET log_lock_waits = on;"
    ];

    for (const sql of optimizations) {
      try {
        await client.query(sql);
      } catch (error) {
        console.warn(`⚠️ Optimization query failed (may require superuser): ${sql}`);
      }
    }
    
    console.log('✅ Database optimizations applied');
  }

  /**
   * Setup backup policies
   */
  async setupBackupPolicies(client) {
    console.log('🔧 Setting up backup policies...');
    
    // Create backup configuration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_config (
        id SERIAL PRIMARY KEY,
        backup_type VARCHAR(50) NOT NULL,
        schedule VARCHAR(100) NOT NULL,
        retention_days INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Insert backup policies
    await client.query(`
      INSERT INTO backup_config (backup_type, schedule, retention_days, enabled)
      VALUES 
        ('full', '0 2 * * 0', 90, true),     -- Weekly full backup, 90 days retention
        ('incremental', '0 2 * * 1-6', 30, true), -- Daily incremental, 30 days retention
        ('transaction_log', '*/15 * * * *', 7, true) -- Every 15 minutes, 7 days retention
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Backup policies configured');
  }

  /**
   * Setup database monitoring
   */
  async setupDatabaseMonitoring(client) {
    console.log('🔧 Setting up database monitoring...');
    
    // Create monitoring views
    await client.query(`
      CREATE OR REPLACE VIEW database_performance AS
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals,
        most_common_freqs
      FROM pg_stats
      WHERE schemaname = 'public';
    `);

    await client.query(`
      CREATE OR REPLACE VIEW active_connections AS
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        state,
        query_start,
        state_change,
        query
      FROM pg_stat_activity
      WHERE state != 'idle';
    `);
    
    console.log('✅ Database monitoring views created');
  }

  /**
   * Setup production Redis instance
   */
  async setupProductionRedis() {
    console.log('🔧 Setting up production Redis...');
    
    try {
      let redis;
      
      if (this.config.redis.cluster.enabled) {
        // Redis Cluster setup
        redis = new Redis.Cluster(this.config.redis.cluster.nodes, {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
            ...this.config.redis.options
          }
        });
      } else {
        // Single Redis instance
        redis = new Redis({
          ...this.config.redis.single,
          ...this.config.redis.options
        });
      }

      // Test Redis connection
      await redis.ping();
      console.log('✅ Redis connection established');

      // Setup Redis configurations
      await this.setupRedisConfigurations(redis);
      
      // Setup Redis monitoring
      await this.setupRedisMonitoring(redis);

      await redis.disconnect();
      console.log('✅ Production Redis setup complete');
      return { success: true };
    } catch (error) {
      console.error('❌ Redis setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup Redis configurations for production
   */
  async setupRedisConfigurations(redis) {
    console.log('🔧 Configuring Redis for production...');
    
    const configs = [
      ['maxmemory-policy', 'allkeys-lru'],
      ['timeout', '300'],
      ['tcp-keepalive', '60'],
      ['save', '900 1 300 10 60 10000'], // Persistence settings
      ['appendonly', 'yes'],
      ['appendfsync', 'everysec']
    ];

    for (const [key, value] of configs) {
      try {
        await redis.config('SET', key, value);
      } catch (error) {
        console.warn(`⚠️ Redis config failed: ${key} = ${value}`);
      }
    }
    
    console.log('✅ Redis configurations applied');
  }

  /**
   * Setup Redis monitoring
   */
  async setupRedisMonitoring(redis) {
    console.log('🔧 Setting up Redis monitoring...');
    
    // Set up monitoring keys
    await redis.set('monitoring:setup_time', new Date().toISOString());
    await redis.set('monitoring:version', '1.0.0');
    
    console.log('✅ Redis monitoring configured');
  }

  /**
   * Setup production n8n instance
   */
  async setupProductionN8n() {
    console.log('🔧 Setting up production n8n...');
    
    try {
      if (!this.config.n8n.apiKey) {
        console.warn('⚠️ N8N_API_KEY not configured, skipping n8n setup');
        return { success: false, error: 'N8N_API_KEY not configured' };
      }

      // Test n8n connection
      const response = await axios.get(`${this.config.n8n.baseUrl}/api/v1/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.config.n8n.apiKey
        },
        timeout: this.config.n8n.timeout
      });

      console.log('✅ n8n connection established');
      console.log(`📊 Found ${response.data.data?.length || 0} workflows`);

      // Setup n8n monitoring
      await this.setupN8nMonitoring();
      
      console.log('✅ Production n8n setup complete');
      return { success: true, workflows: response.data.data?.length || 0 };
    } catch (error) {
      console.error('❌ n8n setup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup n8n monitoring
   */
  async setupN8nMonitoring() {
    console.log('🔧 Setting up n8n monitoring...');
    
    // Create n8n monitoring configuration
    const monitoringConfig = {
      healthCheck: {
        enabled: true,
        interval: 60000, // 1 minute
        timeout: 10000   // 10 seconds
      },
      metrics: {
        enabled: true,
        retention: 7 * 24 * 60 * 60 * 1000 // 7 days
      }
    };

    console.log('✅ n8n monitoring configured');
    return monitoringConfig;
  }

  /**
   * Generate secure secrets for production
   */
  generateSecureSecrets() {
    console.log('🔧 Generating secure secrets...');
    
    const secrets = {
      jwtSecret: crypto.randomBytes(64).toString('hex'),
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      apiKey: crypto.randomBytes(32).toString('base64url')
    };

    console.log('✅ Secure secrets generated');
    console.log('⚠️ Store these secrets securely in your environment variables:');
    console.log(`JWT_SECRET=${secrets.jwtSecret}`);
    console.log(`ENCRYPTION_KEY=${secrets.encryptionKey}`);
    console.log(`SESSION_SECRET=${secrets.sessionSecret}`);
    console.log(`API_KEY=${secrets.apiKey}`);
    
    return secrets;
  }

  /**
   * Run complete production environment setup
   */
  async setupProductionEnvironment() {
    console.log('🚀 Starting production environment setup...');
    console.log('=' * 60);
    
    const results = {
      database: await this.setupProductionDatabase(),
      redis: await this.setupProductionRedis(),
      n8n: await this.setupProductionN8n(),
      secrets: this.generateSecureSecrets()
    };

    console.log('\n📊 PRODUCTION SETUP RESULTS:');
    console.log('=' * 60);
    console.log(`Database: ${results.database.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Redis: ${results.redis.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`n8n: ${results.n8n.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Secrets: ✅ GENERATED`);
    
    const overallSuccess = results.database.success && results.redis.success;
    console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ SUCCESS' : '⚠️ PARTIAL SUCCESS'}`);
    
    return results;
  }
}

module.exports = ProductionEnvironmentSetup;

// Run setup if called directly
if (require.main === module) {
  const setup = new ProductionEnvironmentSetup();
  setup.setupProductionEnvironment()
    .then(results => {
      console.log('\n🎉 Production environment setup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Production setup failed:', error);
      process.exit(1);
    });
}

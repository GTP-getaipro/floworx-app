const { Pool } = require('pg');
const { URL } = require('url');
const SupabaseRestClient = require('./supabase-rest-client');
const Redis = require('ioredis');

const { encrypt, decrypt } = require('../utils/encryption');
// Load environment variables with proper path resolution
const path = require('path');
const dotenv = require('dotenv');

// Try different .env file locations
const envPaths = [
  path.resolve(__dirname, '../../.env'), // Standard: .env in root from backend/database
  path.resolve(__dirname, '../.env'), // Alternative: .env in backend
  path.resolve(process.cwd(), '.env') // Fallback: current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  } catch (_error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ No .env file found, using system environment variables');
}

// Unified Database Connection Manager
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.restClient = null;
    this.useRestApi = true; // Default to REST API
    this.isInitialized = false;
    this.connectionConfig = this.getConnectionConfig();

    // Initialize REST API client as primary method
    try {
      this.restClient = new SupabaseRestClient();
      console.log('✅ Supabase REST API client initialized as PRIMARY connection method');
      console.log('   Using HTTPS REST API instead of direct PostgreSQL connection');
    } catch (error) {
      console.error('❌ Could not initialize REST API client:', error.message);
      console.log('   Falling back to PostgreSQL connection...');
      this.useRestApi = false;
    }
  }

  // Get optimized connection configuration
  getConnectionConfig() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Priority 1: Use DATABASE_URL if available (recommended for production)
    if (process.env.DATABASE_URL) {
      console.log('🔗 Using DATABASE_URL for connection');
      let parsedUrl;
      try {
        parsedUrl = new URL(process.env.DATABASE_URL);
        if (isProduction) {
          console.log('   Connection:', JSON.stringify({
            host: parsedUrl.hostname,
            db: parsedUrl.pathname.substring(1),
            mode: 'postgres',
            hasPassword: !!parsedUrl.password
          }));
        } else {
          console.log(`   Protocol: ${parsedUrl.protocol}`);
          console.log(`   Hostname: ${parsedUrl.hostname}`);
          console.log(`   Port: ${parsedUrl.port}`);
          console.log(`   Database: ${parsedUrl.pathname.substring(1)}`);
          console.log(`   Username: ${parsedUrl.username}`);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse DATABASE_URL:', parseError.message);
      }

      // AGGRESSIVE IPv4 FIX: Parse URL and use individual components
      if (parsedUrl) {
        console.log('   Using parsed URL components for connection');
        return {
          host: parsedUrl.hostname,
          port: parseInt(parsedUrl.port) || 5432,
          database: parsedUrl.pathname.substring(1),
          user: parsedUrl.username,
          password: parsedUrl.password,
          // Supabase requires SSL in production
          ssl: isProduction
            ? {
                rejectUnauthorized: false,
                require: true
              }
            : false,

          // Connection pooling optimized for Supabase
          max: isProduction ? 3 : 10, // Increased for production reliability
          min: 0,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000, // Increased timeout for Supabase
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 500, // Increased retry interval

          // Enhanced error handling
          allowExitOnIdle: true
        };
      }

      // Fallback to connection string if parsing fails
      return {
        connectionString: process.env.DATABASE_URL,
        // Supabase requires SSL in production
        ssl: isProduction
          ? {
              rejectUnauthorized: false,
              require: true
            }
          : false,

        // Connection pooling optimized for Supabase
        max: isProduction ? 3 : 10, // Increased for production reliability
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Increased timeout for Supabase
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 500, // Increased retry interval

        // Enhanced error handling
        allowExitOnIdle: true
      };
    }

    // Priority 2: Fallback to individual DB_* variables
    console.log('🔗 Using individual DB_* environment variables');
    if (isProduction) {
      console.log('   Connection:', JSON.stringify({
        host: process.env.DB_HOST || 'localhost',
        db: process.env.DB_NAME || 'not set',
        mode: 'postgres',
        hasPassword: !!process.env.DB_PASSWORD
      }));
    } else {
      console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
      console.log(`   DB_PORT: ${process.env.DB_PORT || 5432}`);
      console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set'}`);
      console.log(`   DB_USER: ${process.env.DB_USER || 'not set'}`);
    }

    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // Supabase requires SSL in production
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
            require: true
          }
        : false,

      // Connection pooling optimized for Supabase
      max: isProduction ? 3 : 10, // Increased for production reliability
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isProduction ? 0 : 2000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,

      // Enhanced error handling
      allowExitOnIdle: true
    };
  }

  // Initialize database connection with retry logic
  async initialize(retries = 3) {
    if (this.isInitialized) {
      return this.useRestApi ? 'REST_API' : this.pool;
    }

    // Try REST API first (primary method)
    if (this.restClient && this.useRestApi) {
      console.log('🔄 Initializing Supabase REST API connection...');
      try {
        const testResult = await this.restClient.testConnection();
        if (testResult.success) {
          console.log('✅ Supabase REST API connection successful');
          console.log('   Using HTTPS REST API (bypasses network connectivity issues)');
          this.isInitialized = true;
          return 'REST_API';
        } else {
          console.error('❌ REST API connection failed:', testResult.error);
          console.log('   Falling back to PostgreSQL connection...');
          this.useRestApi = false;
        }
      } catch (restError) {
        console.error('❌ REST API initialization failed:', restError.message);
        console.log('   Falling back to PostgreSQL connection...');
        this.useRestApi = false;
      }
    }

    // Fallback to PostgreSQL if REST API fails
    if (!this.useRestApi) {
      console.log('🔄 Falling back to PostgreSQL connection...');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Database connection attempt ${attempt}/${retries}`);
        this.pool = new Pool(this.connectionConfig);

        // Test connection with timeout
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        client.release();

        console.log('✅ Database connection established');
        console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);
        console.log(`   Connection successful on attempt ${attempt}`);

        this.isInitialized = true;

        // Set up connection error handling
        this.pool.on('error', err => {
          console.error('❌ Database pool error:', err);
        });

        this.pool.on('connect', () => {
          console.log('🔗 New database connection established');
        });

        return this.pool;
      } catch (error) {
        console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          console.error('❌ All PostgreSQL connection attempts failed');

          // Try to fall back to REST API
          if (this.restClient) {
            console.log('🔄 Falling back to Supabase REST API...');
            try {
              const testResult = await this.restClient.testConnection();
              if (testResult.success) {
                console.log('✅ Supabase REST API connection successful');
                console.log('   Using REST API instead of direct PostgreSQL connection');
                this.useRestApi = true;
                this.isInitialized = true;
                return 'REST_API'; // Return indicator that we're using REST API
              } else {
                console.error('❌ REST API connection also failed:', testResult.error);
              }
            } catch (restError) {
              console.error('❌ REST API fallback failed:', restError.message);
            }
          }

          console.error('❌ All database connection methods failed');
          console.error('⚠️ Database not available - running in limited mode');
          console.error('   Install PostgreSQL and configure environment variables to enable full functionality');

          // Don't throw error - allow app to run without database
          this.isInitialized = false;
          return null;
        } else {
          console.log(`⏳ Retrying in 2 seconds... (${retries - attempt} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  // Get database pool (initialize if needed)
  async getPool() {
    if (!this.isInitialized || !this.pool) {
      await this.initialize();
    }
    return this.pool;
  }

  // Execute query with automatic connection management and monitoring
  async query(text, params = []) {
    const start = Date.now();
    let _success = true;
    let _error = null;

    // If using REST API, delegate to REST client
    if (this.useRestApi && this.restClient) {
      console.warn('⚠️ Direct SQL queries not supported with REST API');
      console.warn('   Query:', text.substring(0, 100));
      throw new Error('Direct SQL queries not supported with REST API. Use specific methods instead.');
    }

    const pool = await this.getPool();
    if (!pool) {
      throw new Error('Database not available');
    }

    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      // Track query performance
      this.trackQueryPerformance(text, params, duration, true);

      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`⚠️ Slow query detected (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (queryError) {
      const duration = Date.now() - start;
      _success = false;
      _error = queryError;

      // Track failed query
      this.trackQueryPerformance(text, params, duration, false, _error);

      console.error('❌ Database query error:', queryError.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw queryError;
    }
  }

  // Track query performance with monitoring service
  trackQueryPerformance(queryText, params, duration, success, error = null) {
    try {
      // Lazy load monitoring service to avoid circular dependencies
      if (!this.monitoringService) {
        this.monitoringService = require('../services/realTimeMonitoringService');
      }

      this.monitoringService.trackQuery(queryText, params, duration, success, error);
    } catch (monitoringError) {
      // Don't let monitoring errors affect query execution
      console.warn('Monitoring service error:', monitoringError.message);
    }
  }

  // Execute transaction with automatic rollback on error
  async transaction(callback) {
    const pool = await this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================
  // SECURE CREDENTIAL STORAGE
  // =====================================================

  storeEncryptedCredentials(userId, serviceName, credentials) {
    const encryptedData = encrypt(JSON.stringify(credentials));

    const query = `
      INSERT INTO credentials (user_id, service_name, encrypted_data, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id, service_name)
      DO UPDATE SET
        encrypted_data = EXCLUDED.encrypted_data,
        updated_at = NOW()
      RETURNING id, created_at, updated_at
    `;

    return this.query(query, [userId, serviceName, encryptedData]);
  }

  async getEncryptedCredentials(userId, serviceName) {
    const query = `
      SELECT encrypted_data, created_at, updated_at
      FROM credentials
      WHERE user_id = $1 AND service_name = $2
    `;

    const result = await this.query(query, [userId, serviceName]);

    if (result.rows.length === 0) {
      return null;
    }

    const decryptedData = decrypt(result.rows[0].encrypted_data);
    return {
      credentials: JSON.parse(decryptedData),
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  }

  // =====================================================
  // USER MANAGEMENT
  // =====================================================

  async getUserById(userId) {
    // If using REST API, delegate to REST client
    if (this.useRestApi && this.restClient) {
      return await this.restClient.getUserById(userId);
    }

    // Fallback to direct SQL
    const query = `
      SELECT id, email, first_name, last_name, company_name,
             email_verified, onboarding_completed, created_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.query(query, [userId]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    // If using REST API, delegate to REST client
    if (this.useRestApi && this.restClient) {
      return await this.restClient.getUserByEmail(email);
    }

    // Fallback to direct SQL
    const query = `
      SELECT id, email, password_hash, email_verified, first_name, last_name
      FROM users
      WHERE email = $1
    `;

    const result = await this.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  async getRecentActivities(userId, limit = 5) {
    // If using REST API, delegate to REST client
    if (this.useRestApi && this.restClient) {
      return await this.restClient.getRecentActivities(userId, limit);
    }

    // Fallback to direct SQL
    try {
      const query = `
        SELECT action, ip_address, created_at
        FROM security_audit_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await this.query(query, [userId, limit]);
      return result.rows.map(activity => ({
        action: activity.action,
        timestamp: activity.created_at,
        ip_address: activity.ip_address
      }));
    } catch (error) {
      console.log('Activities data not available, returning empty array');
      return [];
    }
  }

  async getOAuthConnections(userId) {
    // If using REST API, delegate to REST client
    if (this.useRestApi && this.restClient) {
      return await this.restClient.getOAuthConnections(userId);
    }

    // Fallback to direct SQL
    try {
      const query = `
        SELECT provider, created_at
        FROM oauth_tokens
        WHERE user_id = $1 AND access_token IS NOT NULL
      `;
      const result = await this.query(query, [userId]);

      const connections = { google: { connected: false } };
      result.rows.forEach(oauth => {
        connections[oauth.provider] = {
          connected: true,
          connected_at: oauth.created_at
        };
      });
      return connections;
    } catch (error) {
      console.log('OAuth data not available, returning default connection status');
      return { google: { connected: false } };
    }
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================

  async healthCheck() {
    try {
      // If using REST API, use the REST client's test connection
      if (this.useRestApi && this.restClient) {
        const testResult = await this.restClient.testConnection();
        return {
          connected: testResult.success,
          method: 'REST API',
          timestamp: testResult.timestamp || new Date().toISOString(),
          error: testResult.success ? null : testResult.error,
          supabaseUrl: this.restClient.supabaseUrl
        };
      }

      // Fallback to direct SQL for PostgreSQL connections
      const result = await this.query('SELECT NOW() as timestamp, version() as version');
      return {
        connected: true,
        method: 'PostgreSQL',
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].version.split(' ')[0],
        poolSize: this.pool ? this.pool.totalCount : 0,
        idleConnections: this.pool ? this.pool.idleCount : 0,
        waitingClients: this.pool ? this.pool.waitingCount : 0
      };
    } catch (error) {
      return {
        connected: false,
        method: this.useRestApi ? 'REST API' : 'PostgreSQL',
        error: error.message
      };
    }
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isInitialized = false;
      console.log('✅ Database connections closed');
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Export both the manager and legacy-compatible pool

// KeyDB singleton instance
let keydbInstance = null;
let keydbConnectionStatus = 'disabled';

/**
 * Get KeyDB client singleton
 * @returns {Object} KeyDB client or no-op client
 */
function getKeyDB() {
  if (keydbInstance) {
    return keydbInstance;
  }

  // Check if KEYDB_URL is provided
  if (!process.env.KEYDB_URL) {
    console.log('🔴 KeyDB disabled - KEYDB_URL not provided');
    keydbConnectionStatus = 'disabled';
    return createNoOpClient();
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      const keydbUrl = new URL(process.env.KEYDB_URL);
      console.log('🔄 Initializing KeyDB connection...');
      console.log('   Connection:', JSON.stringify({
        host: keydbUrl.hostname,
        db: keydbUrl.pathname.substring(1) || '0',
        mode: 'keydb',
        hasPassword: !!keydbUrl.password
      }));
    } else {
      console.log('🔄 Initializing KeyDB connection...');
    }

    keydbInstance = new Redis(process.env.KEYDB_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`🔄 KeyDB retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      }
    });

    // Connection events
    keydbInstance.on('connect', () => {
      console.log('✅ KeyDB connected successfully');
      keydbConnectionStatus = 'enabled';
    });

    keydbInstance.on('error', (error) => {
      console.error('❌ KeyDB connection error:', error.message);
      keydbConnectionStatus = 'disabled';

      // In production, log error but keep process running (fail-open)
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 KeyDB error in production - continuing with no-op client');
        keydbInstance = createNoOpClient();
      }
    });

    keydbInstance.on('close', () => {
      console.log('🔴 KeyDB connection closed');
      keydbConnectionStatus = 'disabled';
    });

    keydbConnectionStatus = 'enabled';
    return keydbInstance;

  } catch (error) {
    console.error('❌ KeyDB initialization failed:', error.message);
    keydbConnectionStatus = 'disabled';
    return createNoOpClient();
  }
}

/**
 * Create no-op KeyDB client for environments without KeyDB
 * @returns {Object} No-op client with KeyDB-compatible methods
 */
function createNoOpClient() {
  const noOpPromise = Promise.resolve(null);

  return {
    get: () => noOpPromise,
    set: () => noOpPromise,
    del: () => noOpPromise,
    expire: () => noOpPromise,
    ttl: () => noOpPromise,
    incr: () => noOpPromise,
    setex: () => noOpPromise,
    hmset: () => noOpPromise,
    hgetall: () => noOpPromise,
    ping: () => Promise.resolve('PONG'),
    disconnect: () => noOpPromise,
    quit: () => noOpPromise
  };
}

/**
 * Get KeyDB connection status
 * @returns {string} 'enabled' or 'disabled'
 */
function getKeyDBStatus() {
  return keydbConnectionStatus;
}

module.exports = {
  databaseManager,
  // Legacy compatibility - will be deprecated
  pool: {
    query: (...args) => databaseManager.query(...args),
    connect: () => databaseManager.getPool().then(pool => pool.connect()),
    end: () => databaseManager.close()
  },
  // New unified interface
  query: (...args) => databaseManager.query(...args),
  transaction: callback => databaseManager.transaction(callback),
  healthCheck: () => databaseManager.healthCheck(),
  close: () => databaseManager.close(),
  initialize: () => databaseManager.initialize(),
  // User management methods
  getUserById: userId => databaseManager.getUserById(userId),
  getUserByEmail: email => databaseManager.getUserByEmail(email),
  createUser: userData => databaseManager.restClient ? databaseManager.restClient.createUser(userData) : null,
  getRecentActivities: (userId, limit) => databaseManager.getRecentActivities(userId, limit),
  getOAuthConnections: userId => databaseManager.getOAuthConnections(userId),
  // Onboarding methods
  getOnboardingStatus: userId => databaseManager.restClient ? databaseManager.restClient.getOnboardingStatus(userId) : null,
  // Password reset methods
  getUserByEmailForPasswordReset: email => databaseManager.restClient ? databaseManager.restClient.getUserByEmailForPasswordReset(email) : null,
  createPasswordResetToken: (userId, token, expiresAt, ipAddress, userAgent) => databaseManager.restClient ? databaseManager.restClient.createPasswordResetToken(userId, token, expiresAt, ipAddress, userAgent) : null,
  getPasswordResetToken: token => databaseManager.restClient ? databaseManager.restClient.getPasswordResetToken(token) : null,
  updateUserPassword: (userId, passwordHash) => databaseManager.restClient ? databaseManager.restClient.updateUserPassword(userId, passwordHash) : null,
  markPasswordResetTokenUsed: token => databaseManager.restClient ? databaseManager.restClient.markPasswordResetTokenUsed(token) : null,
  // KeyDB functions
  getKeyDB,
  getKeyDBStatus
};

const { Pool } = require('pg');

const { encrypt, decrypt } = require('../utils/encryption');
// Load environment variables with proper path resolution
const path = require('path');
const dotenv = require('dotenv');

// Try different .env file locations
const envPaths = [
  path.resolve(__dirname, '../../.env'),   // Standard: .env in root from backend/database
  path.resolve(__dirname, '../.env'),      // Alternative: .env in backend
  path.resolve(process.cwd(), '.env')      // Fallback: current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ Database connection: No .env file found, using system environment variables');
}

// Unified Database Connection Manager
class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
    this.connectionConfig = this.getConnectionConfig();
  }

  // Get optimized connection configuration
  getConnectionConfig() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Priority 1: Use DATABASE_URL if available (recommended for production)
    if (process.env.DATABASE_URL) {
      console.log('🔍 Using DATABASE_URL for connection');
      console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 50)}...`);

      // Parse DATABASE_URL to extract components for debugging
      let parsedUrl;
      try {
        parsedUrl = new URL(process.env.DATABASE_URL);
        console.log(`🔍 DATABASE_URL Components:`);
        console.log(`   Protocol: ${parsedUrl.protocol}`);
        console.log(`   Hostname: ${parsedUrl.hostname}`);
        console.log(`   Port: ${parsedUrl.port}`);
        console.log(`   Database: ${parsedUrl.pathname.substring(1)}`);
        console.log(`   Username: ${parsedUrl.username}`);
      } catch (parseError) {
        console.error('❌ Failed to parse DATABASE_URL:', parseError.message);
      }

      // AGGRESSIVE IPv4 FIX: Parse URL and use individual components
      if (parsedUrl) {
        console.log('🔧 Converting DATABASE_URL to individual components to force IPv4');
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
    console.log('🔍 Using individual DB_* variables for connection');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 5432}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set'}`);

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
    if (this.isInitialized && this.pool) {
      return this.pool;
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
          console.error('❌ All database connection attempts failed');
          console.error('⚠️ Database not available - running in limited mode');
          console.error('Check DATABASE_URL and network connectivity to Supabase');

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
    const pool = await this.getPool();
    const start = Date.now();
    let _success = true;
    let _error = null;

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
    const query = `
      SELECT id, email, password_hash, email_verified, first_name, last_name
      FROM users 
      WHERE email = $1
    `;

    const result = await this.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as timestamp, version() as version');
      return {
        connected: true,
        timestamp: result.rows[0].timestamp,
        version: result.rows[0].version.split(' ')[0],
        poolSize: this.pool ? this.pool.totalCount : 0,
        idleConnections: this.pool ? this.pool.idleCount : 0,
        waitingClients: this.pool ? this.pool.waitingCount : 0
      };
    } catch (error) {
      return {
        connected: false,
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
  initialize: () => databaseManager.initialize()
};

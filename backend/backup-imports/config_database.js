const { Pool } = require('pg');
require('dotenv').config();

// Database configuration with connection pooling
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'floworx_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established

  // SSL configuration for production
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
        rejectUnauthorized: false
      }
      : false
};

// Validate database configuration
const validateDatabaseConfig = () => {
  const requiredVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }
};

// Create connection pool
const createPool = () => {
  validateDatabaseConfig();
  return new Pool(dbConfig);
};

module.exports = {
  dbConfig,
  createPool,
  validateDatabaseConfig
};

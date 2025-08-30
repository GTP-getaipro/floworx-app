const { Pool } = require('pg');

// Create a connection pool for serverless functions
let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
};

module.exports = { getPool };

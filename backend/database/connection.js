const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
const pool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout for cloud connections
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Function to initialize database (create tables if they don't exist)
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesExist = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'credentials')
    `);
    
    if (tablesExist.rows.length < 2) {
      console.log('Database tables not found. Please run the schema.sql file to create them.');
      console.log('Run: psql -d your_database_name -f database/schema.sql');
    } else {
      console.log('Database tables verified successfully');
    }
    
    client.release();
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
};

module.exports = {
  pool,
  initializeDatabase
};

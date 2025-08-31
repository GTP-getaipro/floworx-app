const { Pool } = require('pg');
const SupabaseClient = require('./supabase-client');
require('dotenv').config();

// Legacy PostgreSQL connection pool (for backward compatibility)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  // Optimized for serverless deployment
  max: 1, // Single connection for serverless
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 0,
});

// Initialize Supabase client instance
let supabaseClient = null;

const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = new SupabaseClient();
  }
  return supabaseClient;
};

// Test database connection
pool.on('connect', () => {
  console.log('Connected to Supabase PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in serverless environment
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Function to initialize database (check Supabase schema)
const initializeDatabase = async () => {
  try {
    const client = getSupabaseClient();

    // Test connection
    const connectionTest = await client.testConnection();

    if (!connectionTest.success) {
      throw new Error(`Database connection failed: ${connectionTest.error}`);
    }

    console.log('✅ Supabase database connection successful');
    console.log(`   PostgreSQL version: ${connectionTest.postgresVersion.split(' ')[0]}`);

    // Check if Floworx tables exist
    const tablesExist = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY table_name
    `);

    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics'];
    const existingTables = tablesExist.rows.map(row => row.table_name);

    if (existingTables.length < expectedTables.length) {
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      console.log('⚠️  Missing Floworx database tables:', missingTables);
      console.log('   Run: node database/initialize-supabase.js');
      return false;
    } else {
      console.log('✅ All Floworx database tables verified');
      console.log('   Tables:', existingTables.join(', '));
      return true;
    }

  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  }
};

module.exports = {
  pool, // Legacy pool for backward compatibility
  getSupabaseClient, // New Supabase client with encryption
  initializeDatabase
};

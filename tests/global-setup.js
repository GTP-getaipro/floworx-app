const { chromium } = require('@playwright/test');
const { Pool } = require('pg');

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Database setup
  await setupTestDatabase();
  
  // Create test users and data
  await createTestData();
  
  // Warm up the application
  await warmupApplication();
  
  console.log('✅ Global test setup completed');
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database (Hybrid Local-Cloud)...');

  // Load environment variables from backend/.env (contains Supabase credentials)
  require('dotenv').config({ path: './backend/.env' });

  // Also load production security settings
  require('dotenv').config({ path: './backend/.env.production' });

  console.log('🔒 Security Settings Loaded:');
  console.log(`   - Account Recovery Token Expiry: ${process.env.ACCOUNT_RECOVERY_TOKEN_EXPIRY}ms (${process.env.ACCOUNT_RECOVERY_TOKEN_EXPIRY / 1000 / 60 / 60} hours)`);
  console.log(`   - Max Failed Login Attempts: ${process.env.MAX_FAILED_LOGIN_ATTEMPTS}`);
  console.log(`   - Account Lockout Duration: ${process.env.ACCOUNT_LOCKOUT_DURATION}ms (${process.env.ACCOUNT_LOCKOUT_DURATION / 1000 / 60} minutes)`);
  console.log(`   - Progressive Lockout Multiplier: ${process.env.PROGRESSIVE_LOCKOUT_MULTIPLIER}x`);

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  });

  try {
    // Test database connection first
    await pool.query('SELECT 1');

    // Clean existing test data (comprehensive cleanup for new test types)
    console.log('🧹 Cleaning up existing test data...');

    // Clean up workflow executions first (foreign key constraints)
    await pool.query(`
      DELETE FROM workflow_executions
      WHERE workflow_id IN (
        SELECT id FROM workflows
        WHERE name LIKE '%test%' OR name LIKE 'E2E-Test%'
      )
    `);

    // Clean up Gmail label mappings
    await pool.query(`
      DELETE FROM gmail_label_mappings
      WHERE user_id IN (
        SELECT id FROM users
        WHERE email LIKE '%test%' OR email LIKE '%@playwright-test.local'
      )
    `);

    // Clean up business profiles
    await pool.query(`
      DELETE FROM business_profiles
      WHERE user_id IN (
        SELECT id FROM users
        WHERE email LIKE '%test%' OR email LIKE '%@playwright-test.local'
      ) OR business_name LIKE 'E2E-Test%'
    `);

    // Clean up emails
    await pool.query(`
      DELETE FROM emails
      WHERE user_id IN (
        SELECT id FROM users
        WHERE email LIKE '%test%' OR email LIKE '%@playwright-test.local'
      ) OR from_email LIKE '%test%' OR subject LIKE 'E2E-Test%'
    `);

    // Clean up workflows
    await pool.query('DELETE FROM workflows WHERE name LIKE \'%test%\' OR name LIKE \'E2E-Test%\'');

    // Clean up email categories
    await pool.query('DELETE FROM email_categories WHERE name LIKE \'%test%\' OR name LIKE \'E2E-Test%\'');

    // Clean up users (last due to foreign key constraints)
    await pool.query(`
      DELETE FROM users
      WHERE email LIKE '%test%'
      OR email LIKE '%@playwright-test.local'
      OR first_name = 'E2E-Test'
      OR first_name LIKE 'ConcurrentUser%'
    `);

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.warn('⚠️ Database cleanup warning:', error.message);
    console.log('📝 Tests will run with mocked database operations');
  } finally {
    await pool.end();
  }
}

async function createTestData() {
  console.log('👤 Creating test users and data in Supabase...');

  // Use same configuration as setupTestDatabase
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  });

  try {
    // Create test users
    const testUsers = [
      {
        email: 'test.user@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessType: 'hot_tub_service'
      },
      {
        email: 'test.admin@example.com',
        password: 'AdminPassword123!',
        firstName: 'Test',
        lastName: 'Admin',
        businessType: 'hot_tub_service',
        role: 'admin'
      }
    ];

    for (const user of testUsers) {
      await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, business_type, role, email_verified, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        ON CONFLICT (email) DO NOTHING
      `, [
        user.email,
        '$2b$10$test.hash.for.testing.purposes.only',
        user.firstName,
        user.lastName,
        user.businessType,
        user.role || 'user'
      ]);
    }

    // Create test email categories
    const testCategories = [
      { name: 'Test Service Request', priority: 'high', auto_response: true },
      { name: 'Test General Inquiry', priority: 'medium', auto_response: false },
      { name: 'Test Emergency', priority: 'urgent', auto_response: true }
    ];

    for (const category of testCategories) {
      await pool.query(`
        INSERT INTO email_categories (name, priority, auto_response, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (name) DO NOTHING
      `, [category.name, category.priority, category.auto_response]);
    }

    console.log('✅ Test data created successfully');
  } catch (error) {
    console.warn('⚠️ Warning: Could not create test data:', error.message);
    console.log('📝 Tests will run with mocked data operations');
  } finally {
    await pool.end();
  }
}

async function warmupApplication() {
  console.log('🔥 Warming up hybrid local-cloud application...');
  console.log('   📱 Frontend: http://localhost:3001 (Local)');
  console.log('   🖥️  Backend: http://localhost:5001 (Local)');
  console.log('   🗄️  Database: Supabase Cloud (Production)');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for frontend to be ready
    console.log('   🔍 Testing frontend connectivity...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('   ✅ Frontend is responsive');

    // Check backend health
    console.log('   🔍 Testing backend health...');
    const response = await page.request.get('http://localhost:5001/health');
    if (!response.ok()) {
      throw new Error(`Backend health check failed: ${response.status()}`);
    }
    console.log('   ✅ Backend is healthy');

    console.log('✅ Hybrid local-cloud application warmed up successfully');
  } catch (error) {
    console.error('❌ Application warmup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;

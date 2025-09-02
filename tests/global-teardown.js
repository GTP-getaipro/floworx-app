const { Pool } = require('pg');

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  // Clean up test data
  await cleanupTestData();
  
  // Close any remaining connections
  await closeConnections();
  
  console.log('✅ Global test teardown completed');
}

async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data from Supabase...');

  // Load environment variables from backend/.env (Supabase credentials)
  require('dotenv').config({ path: './backend/.env' });

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  });

  try {
    // Clean test data in correct order (respecting foreign key constraints)
    // Use safe patterns for cloud database (e2e-test and playwright-test prefixes)

    console.log('   🔍 Cleaning test data from Supabase...');

    // Clean workflow executions
    try {
      const execResult = await pool.query('DELETE FROM workflow_executions WHERE workflow_id IN (SELECT id FROM workflows WHERE name LIKE \'%E2E-Test%\' OR name LIKE \'%Playwright%\') RETURNING id');
      console.log(`   🗑️  Cleaned ${execResult.rows.length} test workflow executions`);
    } catch (error) {
      console.log('   ℹ️  Workflow executions table not available');
    }

    // Clean workflows
    try {
      const workflowResult = await pool.query('DELETE FROM workflows WHERE name LIKE \'%E2E-Test%\' OR name LIKE \'%Playwright%\' RETURNING id');
      console.log(`   🗑️  Cleaned ${workflowResult.rows.length} test workflows`);
    } catch (error) {
      console.log('   ℹ️  Workflows table not available');
    }

    // Clean user-related data (enhanced for new test types)
    const testUserPattern = '(email LIKE \'%e2e-test%\' OR email LIKE \'%playwright-test%\' OR first_name = \'E2E-Test\' OR first_name LIKE \'ConcurrentUser%\')';

    // Clean performance metrics
    try {
      const metricsResult = await pool.query(`DELETE FROM performance_metrics WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${metricsResult.rows.length} test performance metrics`);
    } catch (error) {
      console.log('   ℹ️  Performance metrics table not available');
    }

    // Clean notifications
    try {
      const notificationsResult = await pool.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${notificationsResult.rows.length} test notifications`);
    } catch (error) {
      console.log('   ℹ️  Notifications table not available');
    }

    // Clean Gmail label mappings
    try {
      const labelMappingsResult = await pool.query(`DELETE FROM gmail_label_mappings WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${labelMappingsResult.rows.length} test Gmail label mappings`);
    } catch (error) {
      console.log('   ℹ️  Gmail label mappings table not available');
    }

    // Clean business profiles
    try {
      const profilesResult = await pool.query(`DELETE FROM business_profiles WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) OR business_name LIKE '%E2E-Test%' RETURNING id`);
      console.log(`   🗑️  Cleaned ${profilesResult.rows.length} test business profiles`);
    } catch (error) {
      console.log('   ℹ️  Business profiles table not available');
    }

    // Clean emails
    try {
      const emailsResult = await pool.query(`DELETE FROM emails WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) OR from_email LIKE '%test%' OR subject LIKE 'E2E-Test%' RETURNING id`);
      console.log(`   🗑️  Cleaned ${emailsResult.rows.length} test emails`);
    } catch (error) {
      console.log('   ℹ️  Emails table not available');
    }

    // Clean existing user-related data
    try {
      const emailResult = await pool.query(`DELETE FROM email_processing WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${emailResult.rows.length} test email processing records`);
    } catch (error) {
      console.log('   ℹ️  Email processing table not available');
    }

    try {
      const oauthResult = await pool.query(`DELETE FROM oauth_tokens WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${oauthResult.rows.length} test OAuth tokens`);
    } catch (error) {
      console.log('   ℹ️  OAuth tokens table not available');
    }

    try {
      const sessionResult = await pool.query(`DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${sessionResult.rows.length} test user sessions`);
    } catch (error) {
      console.log('   ℹ️  User sessions table not available');
    }

    try {
      const resetResult = await pool.query(`DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE ${testUserPattern}) RETURNING id`);
      console.log(`   🗑️  Cleaned ${resetResult.rows.length} test password reset tokens`);
    } catch (error) {
      console.log('   ℹ️  Password reset tokens table not available');
    }

    // Clean test users
    const userResult = await pool.query('DELETE FROM users WHERE email LIKE \'%e2e-test%\' OR email LIKE \'%playwright-test%\' RETURNING id');
    console.log(`   🗑️  Cleaned ${userResult.rows.length} test users`);

    // Clean test email categories
    try {
      const categoryResult = await pool.query('DELETE FROM email_categories WHERE name LIKE \'%E2E-Test%\' OR name LIKE \'%Playwright%\' RETURNING id');
      console.log(`   🗑️  Cleaned ${categoryResult.rows.length} test email categories`);
    } catch (error) {
      console.log('   ℹ️  Email categories table not available');
    }

    console.log('✅ Test data cleaned successfully from Supabase');
  } catch (error) {
    console.warn('⚠️ Cleanup warning:', error.message);
  } finally {
    await pool.end();
  }
}

async function closeConnections() {
  console.log('🔌 Closing remaining connections...');
  
  // Give time for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Connections closed');
}

module.exports = globalTeardown;

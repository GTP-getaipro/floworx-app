#!/usr/bin/env node

/**
 * Database Connection Fix Script
 * Diagnoses and fixes database connection issues
 */

const { databaseManager, healthCheck } = require('./backend/database/unified-connection');

async function fixDatabaseConnection() {
  console.log('🔍 Diagnosing database connection issues...\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = [];

  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: ${varName === 'DB_PASSWORD' ? '***' : process.env[varName]}`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n🚨 Missing environment variables: ${missingVars.join(', ')}`);
    console.log('Please ensure these are set in your .env file or environment.');
    return false;
  }

  // Test database connection
  console.log('\n🔗 Testing database connection...');
  try {
    const health = await healthCheck();
    
    if (health.connected) {
      console.log('✅ Database connection successful!');
      console.log(`   PostgreSQL version: ${health.version}`);
      console.log(`   Pool size: ${health.poolSize}`);
      console.log(`   Idle connections: ${health.idleConnections}`);
      console.log(`   Waiting clients: ${health.waitingClients}`);
      
      // Test a simple query
      console.log('\n🧪 Testing database query...');
      const { query } = require('./backend/database/unified-connection');
      const result = await query('SELECT COUNT(*) as user_count FROM users');
      console.log(`✅ Query successful! User count: ${result.rows[0].user_count}`);
      
      return true;
    } else {
      console.log('❌ Database connection failed!');
      console.log(`   Error: ${health.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection test failed!');
    console.log(`   Error: ${error.message}`);
    
    // Provide specific troubleshooting based on error type
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting: DNS resolution failed');
      console.log('   - Check if DB_HOST is correct');
      console.log('   - Verify network connectivity');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting: Connection refused');
      console.log('   - Check if database server is running');
      console.log('   - Verify DB_PORT is correct');
    } else if (error.code === '28P01') {
      console.log('\n💡 Troubleshooting: Authentication failed');
      console.log('   - Check DB_USER and DB_PASSWORD');
      console.log('   - Verify user has access to the database');
    } else if (error.code === '3D000') {
      console.log('\n💡 Troubleshooting: Database does not exist');
      console.log('   - Check if DB_NAME is correct');
      console.log('   - Create the database if it doesn\'t exist');
    }
    
    return false;
  }
}

async function testSupabaseConnection() {
  console.log('\n🔍 Testing Supabase connection...');
  
  try {
    const SupabaseClient = require('./backend/database/supabase-client');
    const supabase = new SupabaseClient();
    
    const result = await supabase.testConnection();
    
    if (result.success) {
      console.log('✅ Supabase connection successful!');
      console.log(`   Current time: ${result.currentTime}`);
      console.log(`   PostgreSQL version: ${result.postgresVersion}`);
      
      await supabase.close();
      return true;
    } else {
      console.log('❌ Supabase connection failed!');
      console.log(`   Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Supabase connection test failed!');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('ENCRYPTION_KEY')) {
      console.log('\n💡 Troubleshooting: Missing ENCRYPTION_KEY');
      console.log('   - Add ENCRYPTION_KEY to your environment variables');
      console.log('   - Generate a secure 32-character key');
    }
    
    return false;
  }
}

async function main() {
  console.log('🚀 FloworxInvite Database Connection Fix\n');
  
  // Load environment variables
  require('dotenv').config();
  
  let allGood = true;
  
  // Test unified connection
  const unifiedOk = await fixDatabaseConnection();
  if (!unifiedOk) allGood = false;
  
  // Test Supabase connection
  const supabaseOk = await testSupabaseConnection();
  if (!supabaseOk) allGood = false;
  
  console.log('\n' + '='.repeat(50));
  
  if (allGood) {
    console.log('🎉 All database connections are working properly!');
    console.log('✅ Your app should be able to connect to the database.');
  } else {
    console.log('🚨 Database connection issues detected!');
    console.log('❌ Please fix the issues above before proceeding.');
    
    console.log('\n📝 Common fixes:');
    console.log('1. Ensure all environment variables are set in .env file');
    console.log('2. Verify database server is running and accessible');
    console.log('3. Check firewall and network settings');
    console.log('4. Verify database credentials and permissions');
  }
  
  process.exit(allGood ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixDatabaseConnection, testSupabaseConnection };

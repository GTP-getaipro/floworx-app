#!/usr/bin/env node

const { Pool } = require('pg');
const axios = require('axios');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function validateHybridSetup() {
  log('\n🔍 Validating Hybrid Local-Cloud Setup for Playwright Tests', 'bright');
  log('═'.repeat(70), 'blue');

  let allValid = true;

  // Load environment variables
  require('dotenv').config({ path: './backend/.env' });
  require('dotenv').config({ path: './backend/.env.production' });

  // 1. Validate Local Servers
  log('\n📱 Testing Local Servers...', 'cyan');
  
  // Test Frontend (React) - Try both ports
  let frontendWorking = false;
  const frontendPorts = [3001, 3000];

  for (const port of frontendPorts) {
    try {
      log(`   🔍 Testing frontend server (http://localhost:${port})...`);
      const frontendResponse = await axios.get(`http://localhost:${port}`, { timeout: 5000 });
      if (frontendResponse.status === 200) {
        log(`   ✅ Frontend server is running and responsive on port ${port}`, 'green');
        frontendWorking = true;
        break;
      } else {
        log(`   ❌ Frontend server returned status: ${frontendResponse.status}`, 'red');
      }
    } catch (error) {
      log(`   ❌ Frontend server not accessible on port ${port}: ${error.message}`, 'red');
    }
  }

  if (!frontendWorking) {
    log('   💡 Start with: cd frontend && npm start', 'yellow');
    allValid = false;
  }

  // Test Backend (Express)
  try {
    log('   🔍 Testing backend server (http://localhost:5001)...');
    const backendResponse = await axios.get('http://localhost:5001/health', { timeout: 5000 });
    if (backendResponse.status === 200) {
      log('   ✅ Backend server is running and healthy', 'green');
      log(`   📊 Backend status: ${backendResponse.data.status}`, 'blue');
    } else {
      log(`   ❌ Backend server returned status: ${backendResponse.status}`, 'red');
      allValid = false;
    }
  } catch (error) {
    log(`   ❌ Backend server not accessible: ${error.message}`, 'red');
    log('   💡 Start with: cd backend && npm start', 'yellow');
    allValid = false;
  }

  // 2. Validate Cloud Database Connection
  log('\n🗄️  Testing Supabase Database Connection...', 'cyan');
  
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false },
  });

  try {
    log(`   🔍 Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT}...`);
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    log('   ✅ Supabase database connection successful', 'green');
    log(`   📊 Database time: ${result.rows[0].current_time}`, 'blue');
    log(`   📊 Database version: ${result.rows[0].db_version.split(' ')[0]}`, 'blue');
    
    // Test users table
    try {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      log(`   📊 Users table accessible (${userCount.rows[0].count} users)`, 'blue');
    } catch (userError) {
      log(`   ⚠️  Users table issue: ${userError.message}`, 'yellow');
    }
    
  } catch (error) {
    log(`   ❌ Database connection failed: ${error.message}`, 'red');
    log('   💡 Check Supabase credentials in backend/.env', 'yellow');
    allValid = false;
  } finally {
    await pool.end();
  }

  // 3. Validate Production Security Settings
  log('\n🔒 Validating Production Security Settings...', 'cyan');
  
  const securitySettings = {
    ACCOUNT_RECOVERY_TOKEN_EXPIRY: parseInt(process.env.ACCOUNT_RECOVERY_TOKEN_EXPIRY),
    MAX_FAILED_LOGIN_ATTEMPTS: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS),
    ACCOUNT_LOCKOUT_DURATION: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION),
    PROGRESSIVE_LOCKOUT_MULTIPLIER: parseInt(process.env.PROGRESSIVE_LOCKOUT_MULTIPLIER)
  };

  const expectedSettings = {
    ACCOUNT_RECOVERY_TOKEN_EXPIRY: 86400000,
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCKOUT_DURATION: 900000,
    PROGRESSIVE_LOCKOUT_MULTIPLIER: 2
  };

  Object.entries(expectedSettings).forEach(([key, expectedValue]) => {
    const actualValue = securitySettings[key];
    if (actualValue === expectedValue) {
      log(`   ✅ ${key}: ${actualValue} ✓`, 'green');
    } else {
      log(`   ❌ ${key}: Expected ${expectedValue}, got ${actualValue}`, 'red');
      allValid = false;
    }
  });

  // Display human-readable values
  log('\n   📊 Security Settings Summary:', 'blue');
  log(`   - Account Recovery Token Expiry: ${securitySettings.ACCOUNT_RECOVERY_TOKEN_EXPIRY / 1000 / 60 / 60} hours`, 'blue');
  log(`   - Max Failed Login Attempts: ${securitySettings.MAX_FAILED_LOGIN_ATTEMPTS}`, 'blue');
  log(`   - Account Lockout Duration: ${securitySettings.ACCOUNT_LOCKOUT_DURATION / 1000 / 60} minutes`, 'blue');
  log(`   - Progressive Lockout Multiplier: ${securitySettings.PROGRESSIVE_LOCKOUT_MULTIPLIER}x`, 'blue');

  // 4. Validate Test Configuration
  log('\n🧪 Validating Test Configuration...', 'cyan');
  
  const fs = require('fs');
  const testFiles = [
    'playwright.config.js',
    'tests/global-setup.js',
    'tests/global-teardown.js',
    'tests/utils/test-helpers.js',
    'tests/auth.spec.js'
  ];

  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`   ✅ ${file}`, 'green');
    } else {
      log(`   ❌ ${file} - Missing`, 'red');
      allValid = false;
    }
  });

  // Check Playwright configuration
  if (fs.existsSync('playwright.config.js')) {
    const configContent = fs.readFileSync('playwright.config.js', 'utf8');
    if (configContent.includes('localhost:3000') || configContent.includes('localhost:3001')) {
      const port = configContent.includes('localhost:3000') ? '3000' : '3001';
      log(`   ✅ Playwright configured for local frontend (port ${port})`, 'green');
    } else {
      log('   ❌ Playwright not configured for local frontend', 'red');
      allValid = false;
    }
  }

  // 5. Test Data Safety Validation
  log('\n🛡️  Validating Test Data Safety...', 'cyan');
  
  const testHelperContent = fs.readFileSync('tests/utils/test-helpers.js', 'utf8');
  
  if (testHelperContent.includes('e2e-test') && testHelperContent.includes('playwright-test')) {
    log('   ✅ Test data uses safe prefixes (e2e-test, playwright-test)', 'green');
  } else {
    log('   ❌ Test data safety prefixes not found', 'red');
    allValid = false;
  }

  if (testHelperContent.includes('ssl: { rejectUnauthorized: false }')) {
    log('   ✅ SSL configuration for Supabase connection', 'green');
  } else {
    log('   ❌ SSL configuration missing for Supabase', 'red');
    allValid = false;
  }

  // Final Summary
  log('\n' + '═'.repeat(70), 'blue');
  if (allValid) {
    log('🎉 Hybrid Local-Cloud Setup Validation PASSED!', 'green');
    log('\nSetup Summary:', 'bright');
    log('✅ Local Development Servers: Frontend (3001) + Backend (5001)', 'green');
    log('✅ Cloud Database: Supabase (Production-like data)', 'green');
    log('✅ Security Configuration: Production settings validated', 'green');
    log('✅ Test Safety: Safe test data patterns configured', 'green');
    log('\nReady to run comprehensive E2E tests!', 'cyan');
    log('Run: node run-playwright-tests.js all', 'blue');
  } else {
    log('❌ Hybrid Local-Cloud Setup Validation FAILED!', 'red');
    log('\nPlease address the issues above before running tests.', 'yellow');
  }

  return allValid;
}

// Run validation
if (require.main === module) {
  validateHybridSetup()
    .then(isValid => {
      process.exit(isValid ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation error:', error);
      process.exit(1);
    });
}

module.exports = { validateHybridSetup };

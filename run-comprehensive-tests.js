/**
 * Comprehensive Test Runner with Pre-verified User
 * Creates a verified test user, then runs all API tests
 */

const { query } = require('./backend/database/unified-connection');
const { spawn } = require('child_process');

async function createVerifiedTestUser() {
  console.log('🔧 Setting up verified test user...');
  
  try {
    const timestamp = Date.now();
    const testUser = {
      email: `test.verified.${timestamp}@example.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Verified',
      businessName: 'Test Company',
      phone: '+1234567890'
    };

    // Create user directly in database with verification
    const bcrypt = require('./backend/node_modules/bcrypt');
    const hashedPassword = bcrypt.hashSync(testUser.password, 10);
    
    const insertQuery = `
      INSERT INTO users (email, password_hash, first_name, last_name, company_name, phone, email_verified, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
      RETURNING id, email
    `;
    
    const result = await query(insertQuery, [
      testUser.email,
      hashedPassword,
      testUser.firstName,
      testUser.lastName,
      testUser.businessName,
      testUser.phone
    ]);
    
    if (result.rows.length > 0) {
      console.log('✅ Created verified test user:', result.rows[0].email);
      return testUser;
    } else {
      throw new Error('Failed to create test user');
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting Comprehensive API Testing with Pre-verified User...\n');
  
  try {
    // Create verified test user
    const testUser = await createVerifiedTestUser();
    
    // Set environment variable for the test script
    process.env.TEST_USER_EMAIL = testUser.email;
    process.env.TEST_USER_PASSWORD = testUser.password;
    
    console.log('🧪 Running comprehensive test suite...\n');
    
    // Run the test script
    const testProcess = spawn('node', ['test-all-endpoints.js'], {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    testProcess.on('close', (code) => {
      console.log(`\n📊 Test process completed with code: ${code}`);
      
      if (code === 0) {
        console.log('🎉 ALL TESTS PASSED!');
      } else {
        console.log('⚠️  Some tests failed.');
      }
      
      process.exit(code);
    });
    
    testProcess.on('error', (error) => {
      console.error('❌ Error running tests:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { createVerifiedTestUser, runTests };

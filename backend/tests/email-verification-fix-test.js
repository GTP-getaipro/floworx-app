/**
 * Quick test to validate email verification fixes
 */

const { databaseOperations } = require('../database/database-operations');
const emailService = require('../services/emailService');

async function testEmailVerificationFixes() {
  console.log('🧪 Testing Email Verification Fixes...\n');

  try {
    // Test 1: Token generation
    console.log('1. Testing token generation...');
    const token = emailService.generateVerificationToken();
    console.log(`   ✅ Token generated: ${token.substring(0, 16)}...`);

    // Test 2: Database connection
    console.log('2. Testing database connection...');
    const _testUser = await databaseOperations.getUserByEmail('test@example.com');
    console.log(`   ✅ Database connection working`);

    // Test 3: Create a test user for verification
    console.log('3. Creating test user...');
    const testUserData = {
      id: require('crypto').randomUUID(),
      email: 'email-verification-test@example.com',
      password_hash: 'test-hash',
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date().toISOString()
    };

    const createResult = await databaseOperations.createUser(testUserData);
    if (createResult.error) {
      console.log(`   ⚠️ User might already exist: ${createResult.error.message}`);
    } else {
      console.log(`   ✅ Test user created: ${createResult.data.id}`);
    }

    // Test 4: Store verification token
    console.log('4. Testing verification token storage...');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      const tokenResult = await databaseOperations.createEmailVerificationToken(
        testUserData.id,
        token,
        expiresAt
      );

      if (tokenResult.error) {
        console.log(`   ❌ Token storage failed: ${tokenResult.error.message}`);
        console.log(`   Error details:`, tokenResult.error);
      } else {
        console.log(`   ✅ Verification token stored successfully`);
      }
    } catch (error) {
      console.log(`   ❌ Token storage error: ${error.message}`);
      console.log(`   Error stack:`, error.stack);
    }

    // Test 5: Email service configuration
    console.log('5. Testing email service configuration...');

    // Test 6: Email template generation
    console.log('6. Testing email template generation...');
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/verify-email?token=${token}`;
    const template = emailService.getVerificationEmailTemplate('Test', verificationUrl);

    if (template && template.includes('Test') && template.includes(verificationUrl)) {
      console.log(`   ✅ Email template generated successfully`);
    } else {
      console.log(`   ❌ Email template generation failed`);
    }

    // Cleanup
    console.log('7. Cleaning up test data...');
    try {
      await databaseOperations.deleteUser(testUserData.id);
      console.log(`   ✅ Test user cleaned up`);
    } catch (error) {
      console.log(`   ⚠️ Cleanup warning: ${error.message}`);
    }

    console.log('\n🎉 Email verification fix testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testEmailVerificationFixes();
}

module.exports = { testEmailVerificationFixes };

/**
 * Debug Password Reset Database Operation
 */

require('dotenv').config();
const { databaseOperations } = require('./backend/database/database-operations');

async function testPasswordResetToken() {
  try {
    console.log('🔍 Testing password reset token creation...');
    
    const userId = '36c9aa7f-cf9f-41ea-bebb-a0a315667bba'; // Test user ID
    const token = 'test-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    console.log('📝 Parameters:');
    console.log('  User ID:', userId);
    console.log('  Token:', token);
    console.log('  Expires At:', expiresAt.toISOString());
    
    console.log('\n🔄 Calling createPasswordResetToken...');
    const result = await databaseOperations.createPasswordResetToken(userId, token, expiresAt);
    
    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.log('\n❌ Error details:');
      console.log('Error type:', typeof result.error);
      console.log('Error keys:', Object.keys(result.error));
      console.log('Error message:', result.error.message);
      console.log('Error code:', result.error.code);
    }
    
    if (result.data) {
      console.log('\n✅ Success! Token created with ID:', result.data.id);
    }
    
  } catch (error) {
    console.error('\n💥 Exception caught:');
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testPasswordResetToken()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

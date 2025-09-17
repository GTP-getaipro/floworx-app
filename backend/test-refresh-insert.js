const { databaseOperations } = require('./database/database-operations');
const { makeRefresh } = require('./utils/jwt');

async function testRefreshInsert() {
  try {
    console.log('🔄 Testing refresh token insert...');
    
    // Create a test refresh token
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    const testToken = makeRefresh();
    
    const result = await databaseOperations.createRefreshToken(testUserId, testToken, 30);
    
    if (result.error) {
      console.error('❌ Insert failed:', result.error);
    } else {
      console.log('✅ Insert successful:', result.data);
      
      // Try to find the token
      const findResult = await databaseOperations.findRefreshToken(testToken);
      if (findResult.error) {
        console.error('❌ Find failed:', findResult.error);
      } else {
        console.log('✅ Find successful:', findResult.data);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRefreshInsert();

/**
 * Test the database operations directly
 */

require('dotenv').config();
const { databaseOperations } = require('./backend/database/database-operations');
const { createClient } = require('@supabase/supabase-js');

async function testDatabaseOperations() {
  console.log('🔍 TESTING DATABASE OPERATIONS DIRECTLY');
  console.log('=' .repeat(45));
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Create a test user first
  const { v4: uuidv4 } = require('uuid');
  const testUserId = uuidv4();
  const testEmail = `test-${Date.now()}@example.com`;
  
  try {
    // Step 1: Create test user
    console.log('📝 Step 1: Create test user');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: testEmail,
        password_hash: 'test-hash',
        first_name: 'Test',
        last_name: 'User',
        email_verified: false
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ User creation error:', userError.message);
      return;
    }
    
    console.log('✅ Test user created:', user.id);
    console.log('📊 Initial email_verified:', user.email_verified);
    
    // Step 2: Test database operations connection info
    console.log('\n🔗 Step 2: Check database operations connection');
    const connectionInfo = databaseOperations.getConnectionInfo();
    console.log('📊 Connection info:', connectionInfo);
    
    // Step 3: Test updateUserEmailVerification method
    console.log('\n🔧 Step 3: Test updateUserEmailVerification method');
    console.log('Calling databaseOperations.updateUserEmailVerification...');
    
    try {
      const updateResult = await databaseOperations.updateUserEmailVerification(testUserId, true);
      console.log('📊 Update result:', JSON.stringify(updateResult, null, 2));
      
      if (updateResult.success) {
        console.log('✅ Update method returned success');
      } else {
        console.log('❌ Update method returned failure');
        console.log('Error:', updateResult.error);
      }
    } catch (methodError) {
      console.log('❌ Method threw error:', methodError.message);
      console.log('Stack:', methodError.stack);
    }
    
    // Step 4: Check if user was actually updated
    console.log('\n👤 Step 4: Check if user was updated');
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', testUserId)
      .single();
    
    if (checkError) {
      console.log('❌ User check error:', checkError.message);
    } else {
      console.log('📊 Updated email_verified:', updatedUser.email_verified);
    }
    
    // Step 5: Test other database operations methods
    console.log('\n🔍 Step 5: Test other methods');
    
    // Test getUserById
    try {
      const getUserResult = await databaseOperations.getUserById(testUserId);
      console.log('✅ getUserById works:', getUserResult.data ? 'Yes' : 'No');
    } catch (error) {
      console.log('❌ getUserById error:', error.message);
    }
    
    // Test storeVerificationToken
    try {
      const testToken = 'test-token-' + Date.now();
      const storeResult = await databaseOperations.storeVerificationToken(testUserId, testToken, testEmail, 'Test');
      console.log('✅ storeVerificationToken works:', storeResult.success ? 'Yes' : 'No');
      
      if (storeResult.success) {
        // Test getVerificationToken
        const getResult = await databaseOperations.getVerificationToken(testToken);
        console.log('✅ getVerificationToken works:', getResult.success ? 'Yes' : 'No');
        
        // Clean up token
        await databaseOperations.deleteVerificationToken(testToken);
      }
    } catch (error) {
      console.log('❌ Token operations error:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
    console.log('Stack:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleanup');
    try {
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('✅ Test user deleted');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup error:', cleanupError.message);
    }
  }
}

testDatabaseOperations().catch(console.error);

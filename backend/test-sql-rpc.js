const { databaseOperations } = require('./database/database-operations');

async function testSqlRpc() {
  try {
    console.log('🔄 Testing SQL RPC...');
    
    // Initialize database connection
    await databaseOperations._ensureInitialized();
    
    // Try different RPC methods
    const client = databaseOperations.dbManager.restClient.getAdminClient();
    
    // Test 1: Try exec_sql
    try {
      const result1 = await client.rpc('exec_sql', { sql: 'SELECT 1 as test' });
      console.log('✅ exec_sql works:', result1);
    } catch (error1) {
      console.log('❌ exec_sql failed:', error1.message);
    }
    
    // Test 2: Try execute_sql
    try {
      const result2 = await client.rpc('execute_sql', { query: 'SELECT 1 as test' });
      console.log('✅ execute_sql works:', result2);
    } catch (error2) {
      console.log('❌ execute_sql failed:', error2.message);
    }
    
    // Test 3: Try sql
    try {
      const result3 = await client.rpc('sql', { query: 'SELECT 1 as test' });
      console.log('✅ sql works:', result3);
    } catch (error3) {
      console.log('❌ sql failed:', error3.message);
    }
    
    // Test 4: List available RPC functions
    try {
      const { data, error } = await client
        .from('pg_proc')
        .select('proname')
        .eq('pronamespace', '2200') // public schema
        .like('proname', '%sql%');
      
      if (error) {
        console.log('❌ Cannot list RPC functions:', error.message);
      } else {
        console.log('✅ Available SQL RPC functions:', data);
      }
    } catch (error4) {
      console.log('❌ RPC listing failed:', error4.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSqlRpc();

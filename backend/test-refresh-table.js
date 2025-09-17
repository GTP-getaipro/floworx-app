const { databaseOperations } = require('./database/database-operations');

async function testRefreshTable() {
  try {
    console.log('🔄 Testing refresh_tokens table...');
    
    // Initialize database connection
    await databaseOperations._ensureInitialized();
    
    // Try to query the table
    if (databaseOperations.dbManager.client) {
      // Direct PostgreSQL connection
      const result = await databaseOperations.dbManager.client.query('SELECT COUNT(*) FROM refresh_tokens');
      console.log('✅ Table exists via PostgreSQL:', result.rows[0].count);
    } else {
      // Try REST API
      try {
        const { data, error } = await databaseOperations.dbManager.restClient.getAdminClient()
          .from('refresh_tokens')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('❌ REST API error:', error);
        } else {
          console.log('✅ Table exists via REST API:', data);
        }
      } catch (restError) {
        console.error('❌ REST API exception:', restError);
        
        // Try direct SQL execution
        try {
          const sqlResult = await databaseOperations.dbManager.restClient.getAdminClient()
            .rpc('exec_sql', { sql: 'SELECT COUNT(*) FROM refresh_tokens' });
          console.log('✅ Table exists via SQL RPC:', sqlResult);
        } catch (sqlError) {
          console.error('❌ SQL RPC error:', sqlError);
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRefreshTable();

const { initDb, query, closeDb } = require('./database/unified-connection');

async function checkClientConfigTable() {
  try {
    console.log('🔍 Checking client_config table structure...');
    await initDb();
    
    // Check the table structure
    const tableInfo = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'client_config' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Client Config Table Structure:');
    tableInfo.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    await closeDb();
    console.log('✅ Table structure check completed');
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Full error:', error);
  }
}

checkClientConfigTable();

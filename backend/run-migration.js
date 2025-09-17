const fs = require('fs');
const path = require('path');
const { databaseOperations } = require('./database/database-operations');

async function runMigration() {
  try {
    console.log('🔄 Running refresh tokens migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '002_add_refresh_tokens_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Initialize database connection
    await databaseOperations._ensureInitialized();
    
    // Execute the migration
    if (databaseOperations.dbManager.client) {
      // Direct PostgreSQL connection
      await databaseOperations.dbManager.client.query(migrationSQL);
      console.log('✅ Migration executed successfully via PostgreSQL');
    } else {
      // Split SQL into individual statements for REST API
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement) {
          try {
            await databaseOperations.dbManager.restClient.getAdminClient().rpc('exec_sql', { sql: statement });
            console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
          } catch (error) {
            if (error.message.includes('already exists')) {
              console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
            } else {
              throw error;
            }
          }
        }
      }
      console.log('✅ Migration executed successfully via REST API');
    }
    
    console.log('🎉 Refresh tokens table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

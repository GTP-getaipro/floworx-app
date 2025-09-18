const { createDbManager } = require('../database/unified-connection');
const fs = require('fs');
const path = require('path');

async function runClientConfigMigration() {
  try {
    console.log('🚀 Initializing PostgreSQL connection for client config migration...');

    // Force PostgreSQL connection for migrations
    const dbManager = createDbManager();
    dbManager.useRestApi = false; // Force PostgreSQL
    await dbManager.initialize();

    console.log('📖 Reading client config migration file...');
    const migrationPath = path.join(__dirname, '../database/migrations/003_add_client_config_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('⚡ Running client config migration...');
    await dbManager.query(sql);

    console.log('✅ Client config migration completed successfully');
    console.log('📋 Created table: client_config');
    console.log('📋 Created indexes: idx_client_config_version, idx_client_config_updated_at, idx_client_config_json');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Client config migration failed:', error);
    process.exit(1);
  }
}

runClientConfigMigration();
